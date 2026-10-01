function showToast(message){const t=document.getElementById("toast");if(!t)return;t.textContent=message;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
function togglePassword(id,btn){const input=document.getElementById(id);if(!input)return;input.type=input.type==="password"?"text":"password";btn.textContent=input.type==="password"?"Show":"Hide"}
document.addEventListener("DOMContentLoaded",()=>{
 const login=document.getElementById("loginForm");
 if(login) login.addEventListener("submit",e=>{e.preventDefault();showToast("Login berhasil (demo). Hubungkan ke backend untuk autentikasi nyata.");setTimeout(()=>location.href="index.html",1000)});
 const reg=document.getElementById("registerForm");
 if(reg) reg.addEventListener("submit",e=>{e.preventDefault();const role=document.getElementById("role").value;showToast(role==="artist"?"Akun artist berhasil dibuat (demo).":"Akun client berhasil dibuat (demo).");setTimeout(()=>location.href="login.html",1000)});
 const menu=document.querySelector(".menu-btn"),nav=document.querySelector(".navbar nav");
 if(menu)menu.addEventListener("click",()=>{nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.position="absolute";nav.style.top="78px";nav.style.left="0";nav.style.right="0";nav.style.padding="20px";nav.style.background="#fbfaf8";nav.style.flexDirection="column";nav.style.alignItems="center"});
});