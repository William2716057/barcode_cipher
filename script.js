const CODE39 = {

    "0": "nnnwwnwnn",
    "1": "wnnwnnnnw",
    "2": "nnwwnnnnw",
    "3": "wnwwnnnnn",
    "4": "nnnwwnnnw",
    "5": "wnnwwnnnn",
    "6": "nnwwwnnnn",
    "7": "nnnwnnwnw",
    "8": "wnnwnnwnn",
    "9": "nnwwnnwnn",

    "A": "wnnnnwnnw",
    "B": "nnwnnwnnw",
    "C": "wnwnnwnnn",
    "D": "nnnnwwnnw",
    "E": "wnnnwwnnn",
    "F": "nnwnwwnnn",
    "G": "nnnnnwwnw",
    "H": "wnnnnwwnn",
    "I": "nnwnnwwnn",
    "J": "nnnnwwwnn",

    "K": "wnnnnnnww",
    "L": "nnwnnnnww",
    "M": "wnwnnnnwn",
    "N": "nnnnwnnww",
    "O": "wnnnwnnwn",
    "P": "nnwnwnnwn",
    "Q": "nnnnnnwww",
    "R": "wnnnnnwwn",
    "S": "nnwnnnwwn",
    "T": "nnnnwnwwn",

    "U": "wwnnnnnnw",
    "V": "nwwnnnnnw",
    "W": "wwwnnnnnn",
    "X": "nwnnwnnnw",
    "Y": "wwnnwnnnn",
    "Z": "nwwnwnnnn",

    "-": "nwnnnnwnw",
    ".": "wwnnnnwnn",
    " ": "nwwnnnwnn",
    "$": "nwnwnwnnn",
    "/": "nwnwnnnwn",
    "+": "nwnnnwnwn",
    "%": "nnnwnwnwn"
};

// Code 39 start/stop character
const START_STOP = "nnnwnnwnn";

// Audio settings
const NARROW_TIME = 0.08;      // seconds
const WIDE_TIME   = 0.24;      // seconds

const TONE_FREQUENCY = 800;    // Hz

let audioContext = null;
let activeOscillators = [];


/*
  Convert text into the sequence of barcode elements.
 
  Each returned item is:
 
  {
      bar: true/false,
      width: "n" or "w"
  }
 */
function encodeText(text) {

    text = text.toUpperCase();

    let elements = [];

    // Start character
    addCharacter(elements, START_STOP);

    // Data
    for (const character of text) {

        if (!CODE39[character]) {
            throw new Error(
                "Unsupported character: " + character
            );
        }

        addCharacter(elements, CODE39[character]);
    }

    // Stop character
    addCharacter(elements, START_STOP);

    return elements;
}


// Convert a Code 39 character pattern to alternating bars and spaces.
function addCharacter(elements, pattern) {

    for (let i = 0; i < pattern.length; i++) {

        const width = pattern[i];

        // Even positions are bars.
        // Odd positions are spaces.
        const isBar = (i % 2 === 0);

        elements.push({
            bar: isBar,
            width: width
        });
    }

    // Inter-character gap
    elements.push({
        bar: false,
        width: "n"
    });
}



//Display barcode on the screen.
function generateBarcode() {

    const input = document.getElementById("inputText");
    const barcode = document.getElementById("barcode");
    const status = document.getElementById("status");

    barcode.innerHTML = "";

    try {

        const elements = encodeText(input.value);

        for (const element of elements) {

            const div = document.createElement("div");

            div.className =
                element.bar ? "bar" : "space";

            const width =
                element.width === "w" ? 3 : 1;

            div.style.width = width + "px";

            barcode.appendChild(div);
        }

        status.textContent =
            "Message encoded";

    } catch (error) {

        status.textContent =
            "Error: " + error.message;
    }
}


//Play the barcode as audio. Black lines produce tone. White spaces produce silence.

async function playBarcode() {

    stopBarcode();

    const input =
        document.getElementById("inputText");

    const status =
        document.getElementById("status");

    let elements;

    try {
        elements = encodeText(input.value);
    } catch (error) {
        status.textContent =
            "Error: " + error.message;
        return;
    }

    if (!audioContext) {
        audioContext =
            new (window.AudioContext ||
                 window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    let currentTime =
        audioContext.currentTime + 0.05;

    let barNumber = 0;

    for (const element of elements) {

        const duration =
            element.width === "w"
                ? WIDE_TIME
                : NARROW_TIME;

        if (element.bar) {

            
             // Oscillator for this individual bar.
            const oscillator =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();

            oscillator.type = "sine";

            oscillator.frequency.value =
                TONE_FREQUENCY;

            
             //Fade in/out prevents clicking.
            gain.gain.setValueAtTime(
                0,
                currentTime
            );

            gain.gain.linearRampToValueAtTime(
                0.25,
                currentTime + 0.005
            );

            gain.gain.setValueAtTime(
                0.25,
                currentTime + duration - 0.005
            );

            gain.gain.linearRampToValueAtTime(
                0,
                currentTime + duration
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);

            activeOscillators.push(oscillator);

            barNumber++;
        }

        
        // Whether bar or space, advance in time.
        currentTime += duration;
    }

    const totalTime =
        currentTime - audioContext.currentTime;

    status.textContent =
        "Playing " + barNumber +
        " bars (" +
        totalTime.toFixed(2) +
        " seconds).";
}



  //Stop any currently playing barcode.
function stopBarcode() {

    for (const oscillator of activeOscillators) {

        try {
            oscillator.stop();
        } catch (e) {
            // Already stopped
        }
    }

    activeOscillators = [];

    if (audioContext) {

    }

    document.getElementById("status").textContent =
        "Stopped.";
}
