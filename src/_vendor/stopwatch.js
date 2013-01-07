(function(root) {
	var get_time = function() { return (new Date()).getTime(); };

	var buckets = {};

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
		proto.drop = function(bucket_name) {
			if(!buckets.hasOwnProperty(bucket_name)) {
				buckets[bucket_name] = [];
			}
			var bucket = buckets[bucket_name];
			for(var i = 0; i<bucket.length; i++) {
				if(bucket[i] === this) { return this; }
			}
			bucket.push(this);
			return this;
		};

		my.bucket = function(bucket_name) {
			var bucket = buckets[bucket_name];
			if(bucket) {
				var total_elapsed = 0;
				var laps = {}; 
				for(var i = 0; i<bucket.length; i++) {
					var stopwatch = bucket[i];

					total_elapsed += stopwatch.elapsed();
					var stopwatch_laps = stopwatch.get_laps();
					for(var j = 0; j<stopwatch_laps.length; j++) {
						var stopwatch_lap = stopwatch_laps[j];
						var marker = stopwatch_lap.marker;
						var duration = stopwatch_lap.time;

						if(laps.hasOwnProperty(marker)) {
							laps[marker].time += duration;
							laps[marker].instances++;
						} else {
							laps[marker] = {
								marker: marker,
								time: duration,
								instances: 1
							};
						}
					}
				}
				return {
					elapsed: total_elapsed,
					laps: laps,
					instances: bucket.length
				};
			}
			return undefined;
		};
	}(Stopwatch));

	root.Stopwatch = Stopwatch;
}(this));
