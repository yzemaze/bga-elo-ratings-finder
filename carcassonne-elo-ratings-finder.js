/**
 * BGA Carcassonne Elo Ratings
 *
 * Display Carcassonne Elo ratings given a list of players or fixtures.
 * cf. README.md or https://github.com/yzemaze/bga-duel-box
 *
 * @version 1.0.0
 */

(function() {
"use strict";

const VERSION = "1.0.0";

function log(level, ...args) {
	console[level]("[RF]", ...args);
}

const REQUEST_INTERVAL = 100; // ms
const CACHE_DURATION = 7*24*60*60*1000; // 7d in ms
const DATA_CACHE_DURATION = 2*60*60*1000; // 2h in ms
const GAME_ID = 1;
const GAME_NAME = "Carcassonne";
const SEPARATOR = ";";

let style = document.createElement("style");
style.innerHTML = `
	.drag-handle {
		cursor: pointer;
	}
	.dragging{
		cursor: move !important;
	}
	#ratingsBox {
		box-sizing: border-box;
		display: grid;
		grid-template-rows: max-content 1fr;
		position: absolute;
		left: 0px;
		bottom: 0px;
		width: max-content;
		min-width: fit-content;
		height: max-content;
		min-height: 110px;
		background: #f0f0f0;
		box-shadow: 0 3px 8px rgba(0,0,0,.3);
		border-radius: 8px;
		z-index: 1000;
		resize: both;
		overflow: hidden;
	}
	#ratingsBox * {
		box-sizing: border-box;
	}
	#ratingsBox .duel a {
		color: rgb(72, 113, 182);
		text-decoration: none;
	}
	#ratingsBox h2 {
		font-weight: normal;
		margin: 0;
	}
	#ratingsBox .bga-link {
		font-weight: normal;
	}
	#ratingsBox h2.dfComment {
		font-weight: bold;
	}
	#ratingsBox #boxHead {
		background: #4871b6;
		color: #fff;
		padding: 5px 10px;
		user-select: none;
	}
	#ratingsBox #boxBody {
		display: grid;
		grid-template-rows: 1fr max-content;
		grid-gap: 10px;
		overflow: auto;
		padding: 5px 10px 10px 10px;
	}
	#ratingsBox #inputForm {
		display: grid;
		grid-template-rows: max-content 1fr;
	}
	#ratingsBox #inputForm input {
		width: fit-content;
		border-radius: 5px;
	}
	#boxBody.ratingsView #inputForm {
		display: none;
	}
	#configText, #configTextLabel {
		grid-column: span 2;
	}
	#configText {
		min-height: 100px;
		height: 100%;
		width: 100%;
		border-radius: 5px;
	}
	#ratingsBox #buttonDiv {
		display: grid;
		grid-template-columns: repeat(3, max-content);
		grid-gap: 10px;
		font-size: 1em;
	}
	#ratingsBox #buttonDiv .bgabutton {
		margin: 0;
		height: fit-content;
		width: fit-content;
		border: none;
	}
	#rfFindButton, #rfCloseButton {
		display: block;
	}
	#rfBackButton, #rfCopyButton {
		display: none;
	}
	.ratingsView #rfBackButton, .ratingsView #rfCopyButton, .ratingsView #ratingsTable {
		display: block;
		overflow: auto;
	}
	.ratingsView #rfFindButton, .ratingsView #rfCloseButton {
		display: none;
	}
	#ratingsTable {
		display: none;
		border-spacing: 10px 2px;
		border-collapse: separate;
	}
	#ratingsTable th {
		font-weight: bold;
		text-align: center;
	}
	#ratingsTable td.right {
		text-align: right;
	}
	#ratingsTable.matches tr:nth-child(even):not(:last-child) td {
		border-bottom: 1px dashed black;
	}
	html.dark #ratingsBox {
		background-color: var(--game-palette-bga-gray-244, #3c4054);
		#boxHead {
			background-color: #1f2937;
		}
	}
 `;
document.head.appendChild(style);

log("log", "Carcassonne Elo Ratings Finder v" + VERSION + " initialized");
createUi();

/**
 * Create ui for user interaction.
 *
 */
function createUi() {
	const boxId = "ratingsBox";
	let ratingsBox = document.getElementById(boxId);
	if (ratingsBox) {
		ratingsBox.style.display = "grid";
		log("debug", "UI already exists, displaying box");
		return;
	}
	log("debug", "Creating UI elements");

	ratingsBox = document.createElement("div");
	ratingsBox.id = boxId;
	ratingsBox.setAttribute("data-draggable", true);
	ratingsBox.setAttribute("data-resizable", true);
	let boxHead = document.createElement("h2");
	boxHead.id = "boxHead";
	boxHead.setAttribute("data-drag-handle", true);
	boxHead.innerText = "Ratings Finder";
	boxHead.classList.add("drag-handle");
	let boxBody = document.createElement("div");
	boxBody.id = "boxBody";
	ratingsBox.appendChild(boxHead);
	ratingsBox.appendChild(boxBody);

	const inputForm = document.createElement("form");
	inputForm.id = "inputForm";
	const configText = document.createElement("textArea");
	configText.id = "configText";
	const configTextLabel = document.createElement("label");
	configTextLabel.id = "configTextLabel";
	configTextLabel.htmlFor = "configText";
	configTextLabel.textContent = "List of players";

	inputForm.appendChild(configTextLabel);
	inputForm.appendChild(configText);

	const ratingsTable = document.createElement("table");
	ratingsTable.id = "ratingsTable";

	const buttonDiv = document.createElement("div");
	buttonDiv.id = "buttonDiv";
	const findButton = document.createElement("a");
	findButton.id = "rfFindButton";
	findButton.classList = "bgabutton bgabutton_green";
	findButton.innerText = "➡";
	const backButton = document.createElement("a");
	backButton.id = "rfBackButton";
	backButton.classList = "bgabutton bgabutton_red";
	backButton.innerText = "⬅";
	const closeButton = document.createElement("a");
	closeButton.id = "rfCloseButton";
	closeButton.classList = "bgabutton bgabutton_red";
	closeButton.innerText = "✖";
	const copyButton = document.createElement("a");
	copyButton.id = "rfCopyButton";
	copyButton.classList = "bgabutton bgabutton_blue";
	copyButton.innerText = "📋";
	buttonDiv.appendChild(closeButton);
	buttonDiv.appendChild(findButton);
	buttonDiv.appendChild(backButton);
	buttonDiv.appendChild(copyButton);

	boxBody.appendChild(inputForm);
	boxBody.appendChild(ratingsTable);
	boxBody.appendChild(buttonDiv);

	document.body.appendChild(ratingsBox);
	applyBoxLayout(ratingsBox);

	let timeout;
	const resizeObserver = new ResizeObserver(entries => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			requestAnimationFrame(() => {
				for (const entry of entries) {
					saveBoxLayoutToLocalStorage(entry.target);
				}
			});
		}, 1000);
	});
	resizeObserver.observe(ratingsBox);

	configText.addEventListener("paste", (event) => {
		log("debug", "Paste event triggered");
		// Just check if pasted text is in the form of:
		//
		//   player1
		//   vs
		//   player2
		//   player3
		//   vs
		//   player4
		//   ...
		//
		// and format it.
		const pastedData = (event.clipboardData || window.clipboardData).getData("text");
		event.preventDefault();

		// transform non-empty lines separated by a "vs"-line into one-liners
		const regex = /([^\r\n]+)\s*\n\s*vs\s*\n\s*([^\r\n]+)/g;
		let matches = [];
		let match;
		while ((match = regex.exec(pastedData)) !== null) {
			matches.push(`${match[1].trim()} vs ${match[2].trim()}`);
		}
		const transformedText = matches.length > 0 ? matches.join("\n") : pastedData;

		// Get the current cursor position or selection
		const start = configText.selectionStart;
		const end = configText.selectionEnd;
		// Insert the transformed text at the cursor position
		configText.value = configText.value.slice(0, start) + transformedText + configText.value.slice(end);
		// Move the cursor to the end of the inserted text
		configText.selectionStart = configText.selectionEnd = start + transformedText.length;
	});

	findButton.onclick = async function () {
		log("debug", "Find button clicked");
		configText.disabled = true;
		findButton.disabled = true;
		saveDataToLocalStorage();
		document.getElementById("boxBody").classList.toggle("ratingsView");
		await printPlayerStats();
		findButton.disabled = false;
	};

	backButton.onclick = function () {
		log("debug", "Back button clicked");
		document.getElementById("boxBody").classList.toggle("ratingsView");
		ratingsTable.innerHTML = "";
		configText.disabled = false;
	};

	closeButton.onclick = function () {
		log("debug", "Close button clicked");
		document.body.removeChild(ratingsBox);
	}

	copyButton.onclick = function () {
		log("debug", "Copy button clicked");
		const exportText = document.getElementById("ratingsTable").innerText;
		navigator.clipboard.writeText(exportText);
	}

	retrieveDataFromLocalStorage();
}

/**
 * Returns a player id given its username.
 *
 */
function getPlayerId(name) {
	const currentTime = new Date().getTime();
	const cacheKey = "playerId-" + name.toLowerCase();
	const cached = localStorage.getItem(cacheKey);
	if (cached) {
		const data = JSON.parse(cached);
		if (currentTime - data.timestamp < CACHE_DURATION) {
			log("debug", "Using cached id " + data.id + " for " + name);
			return data.id;
		}
	}

	try {
		log("debug", "Fetching player id for: " + name);
		const response = dojo.xhrGet({
			url: "https://boardgamearena.com/player/player/findplayer.html",
			content: { q: name, start: 0, count: Infinity },
			sync: true,
			handleAs: "json"
		});

		for (const currentUser of response.results[0].items) {
			if (currentUser.q.toLowerCase() === name.toLowerCase()) {
				log("debug", "Found id " + currentUser.id + " for " + name);
				localStorage.setItem(cacheKey, JSON.stringify({ id: currentUser.id, timestamp: currentTime }));
				return currentUser.id;
			}
		}
		log("error", "Could not find user " + name);
		throw "Player not found";
	}
	catch (error) {
		log("error", "Could not find user " + name, error);
		throw error;
	}
}

/**
 * generates CSV from user data
 *
 */
function parsePlayerStats(player_page) {
	let player = player_page.querySelector("#player_name").innerText.trim();
	log("debug", "Parsing player page stats for: " + player);
	/* stats per game */
	let gameDivs = player_page.getElementsByClassName("palmares_game");
	log("debug", "Found " + gameDivs.length + " game sections");
	let foundGame = false;
	for (let i = 0; i < gameDivs.length; i++) {
		let game = gameDivs[i].getElementsByClassName("gamename")[0].innerText;
		if (game == GAME_NAME) {
			foundGame = true;
			log("debug", "Found game " + GAME_NAME + " section");
			var rank = "";
			let rankStr = gameDivs[i].getElementsByClassName("gamerank_no")[0];
			if (rankStr) rank = rankStr.innerText.match(/(\d+)?/)[0];
			let details = gameDivs[i].getElementsByClassName("palmares_details")[0].innerText;
			details = details.split("%")[0];
			let arr = details.match(/(\d+[\s0-9]*)/g);
			var matches = Number(arr[0].replace(/\s/g, ''));
			if (arr.length == 3) {
				var won = Number(arr[1].replace(/\s/g, ''));
			} else {
				matches += Number(arr[1].replace(/\s/g, ''));
				var won = Number(arr[2].replace(/\s/g, ''));
			}
			var elo = gameDivs[i].getElementsByClassName("gamerank_value")[0].innerText;
			log("debug", "Parsed stats for " + player + ": Elo=" + elo + ", Rank=" + rank + ", Matches=" + matches + ", Won=" + won);
			i = gameDivs.length;
		}
	}
	if (!foundGame) {
		log("debug", "Game " + GAME_NAME + " stats not found in player page for " + player);
	}
	return [player, elo, rank, matches, won, (won / matches * 100).toFixed(2)];
}

/* fetches and prints players' stats */
function printPlayerStats() {
	const ratingsTable = document.getElementById("ratingsTable");
	let loading = async () => {
		const parser = new DOMParser();

		let configText = document.getElementById("configText").value.replace(/^\s*[\r\n]/gm, "");
		const lines = configText.split(/\r\n|\r|\n/).length;
		let players = configText.trim().split(/\d+\.\s+| vs | - | – |\n/g);
		if (players.length > lines) {
			ratingsTable.classList.add("matches");
		}
		players = players.filter(e => e);
		log("debug", "Parsed players list: ", players);
		let playerValues;

		const thead = ratingsTable.createTHead();
		const hrow = thead.insertRow();
		["Name", "Elo", "Rank", "Matches", "Won", "%"].forEach(h => {
			hrow.insertCell().outerHTML = "<th>" + h + "</th>";
		});
		const tbody = ratingsTable.createTBody();

		for (let i = 0; i < players.length; ++i) {
			log("debug", "Fetching stats for player (" + (i + 1) + "/" + players.length + "): " + players[i]);
			await sleep(REQUEST_INTERVAL);
			let row = tbody.insertRow();
			const playerUrl = "https://boardgamearena.com/player?name=" + players[i];
			log("debug", "Fetching stats from URL: " + playerUrl);
			const response = await fetch(playerUrl);
			const html_str = await response.text();
			log("debug", "Received response for " + players[i] + " (" + html_str.length + " bytes)");
			const doc = parser.parseFromString(html_str, "text/html");
			try {
				playerValues = parsePlayerStats(doc);
				for (let j = 0; j < playerValues.length; ++j) {
					let cell = row.insertCell(j)
					cell.innerHTML = playerValues[j];
					if (j > 0) { cell.classList = "right"; };
				}
			} catch (err) {
				row.insertCell(0).innerHTML = players[i];
				row.insertCell(1).innerHTML = "n/a";
				log("error", "Error retrieving or parsing stats for player " + players[i] + ": " + err);
				log("error", "Error response document snapshot: ", doc);
			}
		}
		log("debug", "All player stats retrieval complete.");
	};
	loading();
}

async function sleep(ms) {
	await new Promise(resolve => setTimeout(resolve, ms));
}

dragElement(document.getElementById("ratingsBox"));

function dragElement(el) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	document.getElementById("boxHead").onmousedown = dragMouseDown;

	const onmouseupBackup = document.onmouseup;
	const onmousemoveBackup = document.onmousemove;

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		el.style.top = (el.offsetTop - pos2) + "px";
		el.style.left = (el.offsetLeft - pos1) + "px";
	}

	function closeDragElement() {
		document.onmouseup = onmouseupBackup;
		document.onmousemove = onmousemoveBackup;
		saveBoxLayoutToLocalStorage();
	}
}

function saveDataToLocalStorage() {
	let rfData = new Map();
	rfData.configText = document.getElementById("configText").value;
	rfData.lastSaved = Date.now();
	localStorage.setItem("rfData", JSON.stringify(rfData));
	log("debug", "rfData saved to localStorage: ", rfData);
}

function retrieveDataFromLocalStorage() {
	let rfData = "";
	if (localStorage.rfData) {
		rfData = JSON.parse(localStorage.rfData);
		const configText = rfData.configText ?? "";
		document.getElementById("configText").value = configText;
		log("debug", "rfData retrieved from localStorage: ", rfData);
		const lastSaved = rfData.lastSaved;
		if (Date.now() - lastSaved < DATA_CACHE_DURATION) {
			log("debug", "Reloading retrieved rfData (within cache duration)");
			document.getElementById("rfFindButton").click();
			applyBoxLayout();
		}
	} else {
		log("debug", "Could not retrieve rfData from localStorage (no saved data found)");
	}
}

function saveBoxLayoutToLocalStorage(box) {
	const el = box ?? document.getElementById("ratingsBox");
	let rfBoxAttrs = {
		height: el.style.height,
		width: el.style.width,
		top: el.style.top,
		left: el.style.left
	};
	localStorage.setItem("rfBoxAttrs", JSON.stringify(rfBoxAttrs));
	log("debug", "rfLayout saved to localStorage: ", rfBoxAttrs);
}

function applyBoxLayout(box) {
	const el = box ?? document.getElementById("ratingsBox");
	if (localStorage.rfBoxAttrs) {
		const rfBoxAttrs = JSON.parse(localStorage.rfBoxAttrs);
		el.style.height = rfBoxAttrs.height;
		el.style.width = rfBoxAttrs.width;
		el.style.top = rfBoxAttrs.top;
		el.style.left = rfBoxAttrs.left;
		log("debug", "rfBoxAttrs applied: ", rfBoxAttrs);
	}
	saveBoxLayoutToLocalStorage(el);
}

})();
