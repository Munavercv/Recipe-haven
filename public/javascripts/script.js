// ================================================= dropdown
document.querySelector('.dropdown-toggle-btn').addEventListener('click', function () {
    const dropdown = this.parentElement;
    dropdown.classList.toggle('open');
});

// Close dropdown if clicked outside
window.addEventListener('click', function (e) {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    dropdowns.forEach(function (dropdown) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
});
// ================================================= dropdown



// ============================================ fixed nav
// window.onscroll = function() { addFixedNav() };

// function addFixedNav() {
//     const nav = document.getElementById("fixedNav");
    
//     if (window.scrollY > 40) {
//         nav.classList.add("fixed-top", "nav-fixed");
//     } else {
//         nav.classList.remove("fixed-top", "nav-fixed");
//     }
// }
// ============================================ fixed nav