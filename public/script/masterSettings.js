const inputs = document.querySelectorAll(".input");
const hint = document.querySelector(".hint");

const validateInputs = () => {
    for(inp of inputs) {
        console.log(inp.value)
        if(inp.value == "") return false;
    }
    if(inputs[1].value.split(";").length <= 1) return false;
    if(!(/^([0-5][0-9]):([0-5][0-9])$/).test(inputs[4].value)) return false;
    return true;
}

const save = () => {
    
    const agree = confirm("Werden die Spieleinstellungen gespeichert, können keine weiteren Änderungen mehr vorgenommen werden.");

    if(!validateInputs()) return alert("Alle Felder müssen korrekt ausgefüllt sein.");
    
    if (!agree) return 0;

    const savedData = {};

    inputs.forEach((input, idx) => {
        let cache = input.value;
        if (idx === 1) {
            cache = cache.split(";");
            cache.forEach((el, idx) => {
                if (el[0] == " ") cache[idx] = el.substring(1);
            })
        }
        savedData[input.className.split(" ")[1]] = cache;
    })

    console.log(savedData)

    fetch("/storeSettings", {
        method: 'POST',
        body: JSON.stringify(savedData),
        headers: {'Content-Type' : 'application/json'}
    })
    .then(res => res.text())
    .then(data => {
        if (data === "Successfull") window.location.reload();
    })

}

const count = (e) => {
    let value = e.value;
    valueArr = value.split(";");
    valueLength = valueArr.length;
    if (valueLength > 0 && value[0] != undefined) {
        let teamCount = (/[a-zA-Z]/).test(valueArr[valueLength-1]) ? valueLength : valueLength-1;
        hint.textContent = teamCount > 1 ? `${teamCount} Teams` : `${teamCount} Team`;
    } else {
        hint.textContent = "Team-Namen müssen mit einem Semicolon ';' getrennt werden.";
    }
    
}
