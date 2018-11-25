// Called when the Generate button is clicked.
function generateRandom() {
	markLoading(true);

	var options = getOptions();

	getEligiblePokemon(options)
	.then(eligible => chooseRandom(eligible, options))
	.then(generated => htmlifyPokemonArray(generated, options))
	.then(html => document.getElementById("results").innerHTML = html)
	.finally(function() {
		markLoading(false);
		logOptionsToAnalytics(options);
	});
}

function markLoading(isLoading) {
	document.getElementById("controls").className = isLoading ? "loading" : "";
}

function getOptions() {
	return {
		n: Number(document.getElementById("n").value),
		region: document.getElementById("region").value,
		type: document.getElementById("type").value,
		ubers: document.getElementById("ubers").checked,
		nfes: document.getElementById("nfes").checked,
		sprites: document.getElementById("sprites").checked,
		natures: document.getElementById("natures").checked,
		forms: document.getElementById("forms").checked
	};
}

function getEligiblePokemon(options) {
	//TODO cache
	return getPokemonInRegion(options)
		.then(r => filterByOptions(r, options));
}

function getPokemonInRegion(options) {
	return fetch("dex/" + options.region + ".json")
		.then(r => r.json());
}

function filterByOptions(pokemonInRegion, options) {
	return pokemonInRegion.filter(function (pokemon) {
		if (options.forms && "forms" in pokemon) {
			// If we are generating with forms and this Pokémon has forms,
			// filter on them instead of the top-level Pokémon.
			pokemon.forms = filterByOptions(pokemon.forms, options);
			return pokemon.forms.length > 0;
		}

		if (options.type != "all" && !pokemon.types.includes(options.type)) {
			return false;
		}

		if (!options.ubers && pokemon.isUber) {
			return false;
		}

		if (!options.nfes && pokemon.isNfe) {
			return false;
		}

		return true;
	});
}

// Chooses N random Pokémon from the array of eligibles without replacement.
function chooseRandom(eligiblePokemon, options) {
	var chosenArray = [];

	// Deep copy so that we can modify the array as needed.
	var eligiblePokemon = JSON.parse(JSON.stringify(eligiblePokemon));

	while (eligiblePokemon.length > 0 && chosenArray.length < options.n) {
		var chosen = removeRandomElement(eligiblePokemon);

		if (options.forms && chosen.forms) {
			// Choose a random form, getting its ID from the top level.
			var randomForm = removeRandomElement(chosen.forms);
			randomForm.id = chosen.id;
			chosen = randomForm;

			// If we generated a mega, we can't choose any more.
			if (chosen.isMega) {
				eligiblePokemon = removeMegas(eligiblePokemon);
			}
		}

		chosenArray.push(chosen);
	}

	// Megas are more likely to appear at the start of the array,
	// so we shuffle for good measure.
	return shuffle(chosenArray);
}

// Filters megas from the array. Doesn't mutate the original array.
function removeMegas(pokemonArray) {
	return pokemonArray.filter(function (pokemon) {
		if ("forms" in pokemon) {
			pokemon.forms = pokemon.forms.filter(form => !form.isMega);
			return pokemon.forms.length > 0;
		} else {
			return true; // always keep if no forms
		}
	});
}

// Converts a JSON array of Pokémon into an HTML ordered list.
function htmlifyPokemonArray(generatedPokemon, options) {
	var output = "<ol>";
	for (i=0; i<generatedPokemon.length; i++) {
		output += htmlifyPokemon(generatedPokemon[i], options);
	}
	output += "</ol>";

	return output;
}

// Converts JSON for a single Pokémon into an HTML list item.
function htmlifyPokemon(pokemon, options) {
	// http://bulbapedia.bulbagarden.net/wiki/Shiny_Pok%C3%A9mon#Generation_VI
	var shiny = Math.floor(Math.random() * 65536) < 16;

	var title = (shiny ? "Shiny " : "") + pokemon.name;

	if (options.sprites) {
		var out = '<li title="' + title + '">';
	} else {
		var out = '<li class="imageless">';
	}

	if (options.natures) {
		out += '<span class="nature">' + generateNature() + "</span> ";
	}
	out += pokemon.name;
	if (shiny) {
		out += ' <span class="shiny">&#9733;</span>';
	}
	if (options.sprites) {
		var sprite = getSpritePath(pokemon, shiny);
		out += '<div class="wrapper"><img src="' + sprite + '" alt="' + title + '" title="' + title + '" /></div>';
	}

	out += "</li>";

	return out;
}

function getSpritePath(pokemon, shiny) {
	var path = shiny ? PATH_TO_SHINY_SPRITES : PATH_TO_SPRITES;
	var name = pokemon.id;
	if (pokemon.spriteSuffix) {
		name = name + "-" + pokemon.spriteSuffix;
	}
	return path + name + SPRITE_EXTENTION;
}

function generateNature() {
	return getRandomElement(NATURES);
}

const NATURES = ["Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", "Mild", "Modest", "Na&iuml;ve", "Naughty", "Quiet", "Quirky", "Rash", "Relaxed", "Sassy", "Serious", "Timid"];

function getRandomElement(arr) {
	return arr[randomInteger(arr.length)];
}

function removeRandomElement(arr) {
	return arr.splice(randomInteger(arr.length), 1)[0];
}

// Modern Fisher-Yates shuffle.
function shuffle(arr) {
	for (var i = arr.length - 1; i > 0; i--) {
		var j = randomInteger(i + 1);
		var temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

function randomInteger(maxExclusive) {
	return Math.floor(Math.random() * maxExclusive);
}