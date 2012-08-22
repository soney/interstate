(function() {
	var Album = function(title, artist, cover_src, songs) {
		this.title = title;
		this.artist = artist;
		this.cover_src = "album_art/"+cover_src;
		var self = this;
		this.songs = songs.map(function(song) {
			return new Song(song.title, song.duration, self);
		});
	};
	var Song = function(title, duration, album) {
		this.title = title;
		this.duration = duration;
		this.album = album;
	};

	window.albums =  [	new Album("Batman Begins", "Hans Zimmer", "batman_begins.jpeg", [
								{title: "Vespertilio", duration: 2.87}
								, {title: "Molossus", duration: 4.82}
							])
					, new Album("Black and Yellow", "Wiz Khalifa", "black_and_yellow.jpeg", [
								{title: "Black and Yellow", duration: 3.62}
							])
					, new Album("Brave New World", "Iron Maiden", "brave_new_world.jpeg", [
								{title: "Ghost of the Navigator", duration: 6.83}
							])
					, new Album("Crimson Tide", "Hans Zimmer", "crimson_tide.jpeg", [
								{title: "Mutiny", duration: 8.95}
								, {title: "Alabama", duration: 23.82}
								, {title: "Little Ducks", duration: 2.03}
								, {title: "1SQ", duration: 18.05}
								, {title: "Roll Tide", duration: 7.55}
							])
					, new Album("Dark Knight", "Hans Zimmer", "dark_knight.jpeg", [
								{title: "Why So Serious?", duration: 9.23}
								, {title: "I Am The Batman", duration: 1.98}
								, {title: "A Dark Knight", duration: 16.25}
							])
					, new Album("Dark Side of the Moon", "Pink Floyd", "dark_side_of_the_moon.jpeg", [
								{title: "Money", duration: 6.37}
								, {title: "Time", duration: 6.82}
								, {title: "Brain Damage", duration: 3.77}
								, {title: "On the Run", duration: 3.83}
								, {title: "The Great Gig in the Sky", duration: 4.73}
								, {title: "Us And Them", duration: 7.82}
							])
					, new Album("Death Magnetic", "Metallica", "death_magnetic.jpeg", [
								{title: "All Nightmare Long", duration: 7.95}
								, {title: "Cyanide", duration: 6.65}
								, {title: "The Unforgiven III", duration: 7.77}
								, {title: "The Day That Never Comes", duration: 7.93}
							])
					, new Album("Gladiator", "Hans Zimmer", "gladiator.jpeg", [
								{title: "The Battle", duration: 10.03}
								, {title: "Am I Not Merciful", duration: 3.93}
								, {title: "Now We Are Free", duration: 3.40}
							])
					, new Album("Inception", "Hans Zimmer", "inception.jpeg", [
								{title: "Paradox", duration: 3.42}
								, {title: "Waiting for A Train", duration: 9.50}
								, {title: "One Simple Idea", duration: 2.47}
								, {title: "Dream Is Collapsing", duration: 2.38}
							])
					, new Album("Minutes to Midnight", "Linkin Park", "minutes_to_midnight.jpeg", [
								{title: "Bleed It Out", duration: 2.77}
								, {title: "What I've Done", duration: 3.48}
							])
					, new Album("Nevermind", "Nirvana", "nevermind.jpeg", [
								{title: "Smells Like Teen Spirit", duration: 5.03}
								, {title: "Comes As You Are", duration: 3.65}
							])
					, new Album("No Hassle", "Tosca", "no_hassle.jpeg", [
								{title: "My First", duration: 5.70}
								, {title: "Piano Intro - Live", duration: 4.03}
							])
					, new Album("Octavarium", "Dream Theater", "octavarium.jpeg", [
								{title: "These Walls", duration: 6.98}
								, {title: "Panic Attack", duration: 7.27}
								, {title: "Never Enough", duration: 6.55}
							])
					, new Album("Riot", "Paramore", "paramore.jpeg", [
								{title: "Misery Business", duration: 3.52}
								, {title: "That's What You Get", duration: 3.67}
							])
					, new Album("Sherlock Holmes", "Hans Zimmer", "sherlock_holmes.jpeg", [
								{title: "Discombobulate", duration: 2.42}
								, {title: "Marital Sabotage", duration: 3.73}
							])
				];
})();
