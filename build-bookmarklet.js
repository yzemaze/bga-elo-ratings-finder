const fs = require("fs");
const path = require("path");

const SOURCE_FILE = path.join(__dirname, "carcassonne-elo-ratings-finder.js");
const TARGET_FILE = path.join(__dirname, "README.md");

function updateBookmarklet() {
	try {
		const sourceCode = fs.readFileSync(SOURCE_FILE, "utf8");
		const encoded = "javascript:(function()%7B" + encodeURIComponent(sourceCode) + "%7D)()%3B";

		let readme = fs.readFileSync(TARGET_FILE, "utf8");
		const regex = /javascript:\(function\(\)%7B[\s\S]*?%7D\)\(\)%3B/;

		if (regex.test(readme)) {
			readme = readme.replace(regex, encoded);
			fs.writeFileSync(TARGET_FILE, readme, "utf8");
			console.log("[RF] README.md bookmarklet successfully updated.");
		} else {
			console.error("[RF] Error: Could not find the bookmarklet placeholder in README.md");
			process.exit(1);
		}
	} catch (err) {
		console.error("[RF] Error:", err.message);
		process.exit(1);
	}
}

updateBookmarklet();
