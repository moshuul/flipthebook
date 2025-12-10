
window.inkData = {
    passages: [
        {
            id: "artist-statement",
            title: "Artist Statement",
            text: `Taking myself to stages illuminated by varying lights and digital effects, I immersed myself in a dynamic landscape of artistic, technological, and entrepreneurial. Believing in design’s power to bridge science, technology, and business, I leveraged user experience principles, behavioral economics, and technological feasibility to create solutions that resonate both artistically and commercially, ensuring creativity translates into tangible value across industries.`
        },
        {
            id: "essay-1",
            title: "Essay – Bridges",
            text: `Believing in design’s power to bridge science, technology, and business...`
        },
        {
            id: "haiku-pack",
            title: "Haiku Pack",
            text: `code as falling ink
hands trace ellipse orbits
pages breathe in light`
        }
    ],

    formats: {
        landscape: { label: "Landscape 16:9 (Spread)", pages: "spread", aspect: 16 / 9, size: [1280, 720] },
        portrait: { label: "Portrait 9:16 (Single Page)", pages: "single", aspect: 9 / 16, size: [720, 1280] },
        square: { label: "Square 1:1 (Single Page)）", pages: "single", aspect: 1, size: [900, 900] }
    },

    presets: [
        {
            id: "sq-minimal",
            label: "Square · Minimal",
            format: "square",
            passage: "artist-statement",
            params: { fontSize: 18, wave: 4, blur: 0 }
        },
        {
            id: "land-spread-soft",
            label: "Landscape · Spread · Soft",
            format: "landscape",
            passage: "essay-1",
            params: { fontSize: 22, wave: 8, blur: 6 }
        },
        {
            id: "portrait-haiku",
            label: "Portrait · Haiku",
            format: "portrait",
            passage: "haiku-pack",
            params: { fontSize: 28, wave: 2, blur: 0 }
        }
    ]
};


console.log("[ink%] inkData loaded:", window.inkData);
