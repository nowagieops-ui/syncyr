// 1. REGISTER THE ENGINE
gsap.registerPlugin(ScrollTrigger);

// 2. HERO ANIMATIONS (MONOLITH SLOW MOTION)
if (document.querySelector(".hero-sigil")) {
    
    const heroTl = gsap.timeline();

    // GLACIAL ARRIVAL
    heroTl.fromTo(".hero-sigil", 
        { scale: 0.2, opacity: 0, filter: "blur(30px) brightness(0)" },
        { scale: 1, opacity: 1, filter: "blur(0px) brightness(1)", duration: 6.0, ease: "power2.inOut" }
    )
    // HIGH-VOLTAGE IGNITION
    .to(".hero-sigil", { filter: "drop-shadow(0 0 100px rgba(130, 0, 255, 1)) brightness(1.5)", duration: 2.0, ease: "power2.inOut" })
    .to(".hero-sigil", { filter: "drop-shadow(0 0 40px rgba(80, 0, 255, 0.7)) brightness(1)", duration: 2.0, ease: "power2.out", onComplete: startBreathing }); 

    // TEXT ARRIVAL
    heroTl.fromTo(".hero-title", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=2.5"); 
    heroTl.fromTo(".hero-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=1.0");
    
    if (document.querySelector(".hero-credibility")) {
        heroTl.fromTo(".hero-credibility", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");
    }

    heroTl.to(".hero-scroll-indicator", { opacity: 1, duration: 1 }, "-=0.5");

    // BREATHING LOOP
    function startBreathing() {
        gsap.to(".hero-sigil", { scale: 1, filter: "drop-shadow(0 0 20px rgba(74, 0, 224, 0.5)) brightness(1)", duration: 1 });
        gsap.to(".hero-sigil", { scale: 1.25, filter: "drop-shadow(0 0 120px rgba(160, 80, 255, 1)) brightness(1.7)", duration: 3.5, delay: 1, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }
}

function highlightActivePage() {
    // Get the current path and clean it up
    let path = window.location.pathname.split("/").pop().replace(".html", "");
    
    // If the path is empty (root domain), it's the Home page
    if (path === "" || path === "index") {
        path = "/";
    }

    const allLinks = document.querySelectorAll('.nav-link, .mobile-link');
    
    allLinks.forEach(link => {
        link.classList.remove('active');
        const linkTarget = link.getAttribute('href').replace(".html", "");
        
        if (path === linkTarget) {
            link.classList.add('active');
        }
    });
}
highlightActivePage();

// ==============================================
// 3. CINEMATIC SCROLL SECTIONS (THE FIX)
// ==============================================

function animateSection(sectionID) {
    if (document.querySelector(sectionID)) {
        // FIX: We are now animating the entire section box, overriding the CSS opacity: 0
        gsap.fromTo(sectionID, 
            { opacity: 0, y: 50 }, 
            {
                opacity: 1,
                y: 0,
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: sectionID,
                    start: "top 80%", 
                    toggleActions: "play none none reverse" 
                }
            }
        );
    }
}

// ==============================================
// 4. APPLY ANIMATIONS TO PAGES
// ==============================================

// Home Page
animateSection("#what");
animateSection("#why");
animateSection("#architecture");
animateSection("#framework");
animateSection("#deployment");
animateSection("#closing");

// About Page
animateSection("#origin");
animateSection("#different");
animateSection("#ceymirion-rel");
animateSection("#ray");
animateSection("#matters");
animateSection("#closing-about");

// Contact Page
animateSection("#conversation");
animateSection("#details");
animateSection("#who");
animateSection("#closing-contact");






// 6. WORD-BY-WORD FOOTER REVEAL
if (document.querySelector("#reveal-tagline")) {
    gsap.to("#reveal-tagline span", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.8,
        stagger: 0.15, // Delay between each word
        ease: "power2.out",
        scrollTrigger: {
            trigger: ".footer-seal",
            start: "top 90%", // Starts when the footer is almost visible
            toggleActions: "play none none reverse"
        }
    });
}








// Apply to R.A.Y. Page Sections
animateSection("#definition");
animateSection("#explains");
animateSection("#not");
animateSection("#why-ray");
animateSection("#relation");
animateSection("#paper");








// Apply to Architecture Page Sections
animateSection("#why-arch");
animateSection("#stack");
animateSection("#public-safe");
animateSection("#deployment-matters");
animateSection("#grounded");
animateSection("#arch-closing");


// MOBILE MENU LOGIC
const navToggle = document.querySelector('.mobile-nav-toggle');
const navOverlay = document.querySelector('.mobile-nav-overlay');

if (navToggle && navOverlay) {
    navToggle.addEventListener('click', function() {
        // This toggles the 'active' class which turns the burger into an X
        this.classList.toggle('active'); 
        navOverlay.classList.toggle('active');
        
        // Lock scroll when menu is open
        if (navOverlay.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });

    // Close menu if a link is clicked
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
}


// Apply to Evidence Page Sections
animateSection("#why-evidence");
animateSection("#tracking");
animateSection("#future-evidence");
animateSection("#status");
animateSection("#signals");
animateSection("#evidence-closing");







// Add this line to your Hero GSAP timeline
gsap.to(".brand-pronunciation", { 
    opacity: 1, 
    y: 0, 
    duration: 1, 
    delay: 0.8, // Appears just after the main subtitle
    ease: "power2.out" 
});