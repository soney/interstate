(function(root) {
	var get_time = function() { return (new Date()).getTime(); };

	var Stopwatch = function(auto_start) {
		this._elapsed_time = 0;
		this._start_time = undefined;
		this._stop_time = undefined;
		this._last_lap_time = undefined;
		this._laps = [];
		this._markers = [];
	};

	(function(my) {
		var proto = my.prototype;
		proto.start = function() {
			this._start_time = get_time();
			this._last_lap_time = this._start_time;
			return this;
		};
		proto.lap = function(marker) {
			var time = get_time();
			var lap_time = time - this._last_lap_time;
			this._laps.push({
				marker: marker,
				time: lap_time
			});
			this._last_lap_time = time;
			return lap_time;
		};
		proto.stop = function() {
			this._stop_time = get_time();
			var elapsed = this._stop_time - this._start_time;
			this._elapsed_time += elapsed;
			return elapsed;
		};
		proto.get_laps = function() {
			return this._laps.slice();
		};
		proto.elapsed = function() {
			return this._elapsed_time;
		};
		proto.reset = function() {
			this._elapsed_time = 0;
			this.start();
			return this;
		};
	}(Stopwatch));

	root.Stopwatch = Stopwatch;
	console.log("A");
}(this));
