import { beforeEach, describe, expect, test, vi } from "vitest";

/** redirect() throws. A sentinel keeps the mock from changing the flow. */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signIn: vi.fn(),
  updateUser: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
      signInWithPassword: mocks.signIn,
      updateUser: mocks.updateUser,
    },
    from: vi.fn(() => ({
      update: mocks.update.mockReturnValue({ eq: mocks.eq }),
    })),
  })),
}));

import { updateName, updatePassword } from "./actions";

const USER = { id: "u1", email: "buyer@example.com" };

/** Runs the action and returns where it sent the browser, or the message it showed. */
async function run(
  action: (state: { message: string }, data: FormData) => Promise<{ message: string }>,
  fields: Record<string, string>,
) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);

  try {
    const state = await action({ message: "" }, data);
    return { to: null as string | null, message: state.message };
  } catch (error) {
    if (error instanceof Redirect) return { to: error.to, message: null as string | null };
    throw error;
  }
}

describe("updateName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.eq.mockResolvedValue({ error: null });
  });

  test("refuses a blank name without asking Supabase", async () => {
    const { to, message } = await run(updateName, { fullName: "   " });

    expect(to).toBeNull();
    expect(message).toBe("Nama wajib diisi.");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  test("asks a signed-out visitor to sign in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const { to, message } = await run(updateName, { fullName: "Siti" });

    expect(to).toBeNull();
    expect(message).toBe("Masuk dulu sebelum mengubah data akun.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // The action is the boundary: only full_name may leave the form, so a forged
  // role in the FormData cannot reach the query even though 0040 would refuse
  // the column anyway.
  test("writes the trimmed name to the visitor's own row", async () => {
    const { to } = await run(updateName, { fullName: "  Siti Rahayu  " });

    expect(mocks.update).toHaveBeenCalledWith({ full_name: "Siti Rahayu" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "u1");
    expect(to).toBe("/account/edit?saved=nama");
  });

  test("shows the error and does not redirect when the save fails", async () => {
    mocks.eq.mockResolvedValueOnce({ error: { message: "denied" } });

    const { to, message } = await run(updateName, { fullName: "Siti" });

    expect(to).toBeNull();
    expect(message).toBe("Gagal menyimpan nama. Coba lagi.");
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.signIn.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  test("refuses a short or mismatched password without asking Supabase", async () => {
    expect(
      (await run(updatePassword, { currentPassword: "a", newPassword: "b", confirmPassword: "b" }))
        .message,
    ).toBe("Password baru minimal 6 karakter.");

    expect(
      (
        await run(updatePassword, {
          currentPassword: "lama123",
          newPassword: "baru123",
          confirmPassword: "beda123",
        })
      ).message,
    ).toBe("Password baru dan konfirmasinya tidak sama.");

    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  test("refuses an empty field without asking Supabase", async () => {
    const { message } = await run(updatePassword, {
      currentPassword: "",
      newPassword: "baru123",
      confirmPassword: "baru123",
    });

    expect(message).toBe("Semua field password wajib diisi.");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  // The old password is the whole feature: a hijacked session alone must not
  // be enough to lock the owner out.
  test("rejects a wrong old password and never writes the new one", async () => {
    mocks.signIn.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });

    const { to, message } = await run(updatePassword, {
      currentPassword: "salah123",
      newPassword: "baru123",
      confirmPassword: "baru123",
    });

    expect(to).toBeNull();
    expect(message).toBe("Password lama salah.");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  test("proves the old password, then writes the new one", async () => {
    const { to } = await run(updatePassword, {
      currentPassword: "lama123",
      newPassword: "baru123",
      confirmPassword: "baru123",
    });

    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: "lama123",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "baru123" });
    expect(to).toBe("/account/edit?saved=password");
  });

  test("surfaces the auth error when the write fails", async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { message: "weak" } });

    const { to, message } = await run(updatePassword, {
      currentPassword: "lama123",
      newPassword: "baru123",
      confirmPassword: "baru123",
    });

    expect(to).toBeNull();
    expect(message).toBe("weak");
  });
});
