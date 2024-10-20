const btn = document.querySelector(".confPw");
const inp = document.querySelector(".pwInp");
const selectDestination = document.querySelector(".selectDestination");
let CLICKABLE = false;

const checkLenght = (e) => {
    if(e.value.lenght === 0) {
        btn.style.opacity = 0.5;
        CLICKABLE = false;
        return;
    }
    CLICKABLE = true;
    btn.style.opacity = 1;
}

const sendPw = () => {
    if(!CLICKABLE) return;
    const passwordEntered = inp.value;
    
    fetch("/validatePassword", {
        method: 'POST',
        body: JSON.stringify({password: passwordEntered, destination: selectDestination.value}),
        headers: {'Content-Type' : 'application/json'}
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            localStorage.setItem("passwordGame", passwordEntered);
            window.location.href = "/" + selectDestination.value;
        } else {
            inp.value = "";
            console.log("Password is incorrect")
        }
    })
}

if(localStorage.getItem("passwordGame")) {
    inp.value = localStorage.getItem("passwordGame");
    btn.style.opacity = 1;
    CLICKABLE = true;
}

console.log(crypto.randomUUID())