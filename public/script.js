fetch("/list")
    .then(res => res.json())
    .then(files => {
        let ul = document.getElementById("list");
        files.forEach(f => {
            let li = document.createElement("li");
            li.innerHTML = `<a href="/files/${f}" target="_blank">${f}</a>`;
            ul.appendChild(li);
        });
    });
