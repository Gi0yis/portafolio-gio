document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        document.querySelectorAll(".main-content section").forEach(section => {
            section.style.display = "none";
        });
        document.querySelector(link.getAttribute("href")).style.display = "block";
    });
});
