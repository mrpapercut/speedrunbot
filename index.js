const fetch = require('node-fetch');

class SpeedrunAPI {
	constructor() {
		this.apiurl = 'https://www.speedrun.com/api/v1';
		this.records = {};
	}
	
	_pad(str) {
		return ('00' + str).substr(-2);
	}

	parseTime(time) {
		let p = this._pad;
		
		let hours = Math.floor(time / 3600);
		let minutes = Math.floor((time % 3600) / 60);
		let seconds = Math.floor(((time % 3600) % 60) % 60);
		let ms = (parseFloat(time) % 1).toFixed(3).split('.').pop();

		if (hours !== 0) {
			return `${hours}:${p(minutes)}:${p(seconds)}${ms !== '000' ? '.' + ms : ''}`;
		} else {
			if (minutes !== 0) {
				return `${minutes}:${p(seconds)}${ms !== '000' ? '.' + ms : ''}`;
			} else {
				return `${seconds}${ms !== '000' ? '.' + ms : ''}`;
			}
		}
	}
	
	finishedFetching(runid) {
		return this.records[runid].fetchedGame
			&& this.records[runid].fetchedUsers
			
	}

	fetchRuns() {
		fetch(`${this.apiurl}/runs?status=verified&orderby=verify-date&direction=desc`)
			.then(
				res => res.json(),
				err => console.error(err)
			)
			.then(json => {
				this.fetchLeaderboards(json);
				// console.log(JSON.stringify(json));
			});
	}
	
	fetchLeaderboards(runs) {	
		runs.data.forEach(run => {		
			let url = `${this.apiurl}/leaderboards/${run.game}`;
			
			if (run.level !== null) {
				url = `${url}/level/${run.level}/${run.category}`
			} else {
				url = `${url}/category/${run.category}`;
			}
			
			if (run.system && run.system.platform) {
				// url += `?platform=${run.system.platform}`;
			}
			
			fetch(url).then(
				res => res.json(),
				err => console.error(er)
			).then(json => {
				json.data.runs.filter(r => {
					return r.run.id === run.id
				}).forEach(r => {
					if (r.place === 1) {
						this.fetchRecordDetails(run, r);
					}
				});
			});
		});
	}
	
	fetchRecordDetails(run, rankedrun) {
		const runid = run.id;
		
		this.records[runid] = {
			run: run,
			rankedrun: rankedrun,
			game: {},
			users: [],
			platform: {},
			category: {},
			subcategories: [],
		};
		
		// Get users
		this.records[runid].run.players.forEach(player => {
			this.fetchUsers(runid, player.id);
		});
		
		// Get subcategories
		const {values} = this.records[runid].rankedrun.run;
		
		for (let c in values) {
			this.fetchSubcategories(c, values[c], runid);
		}
		
		// Fetch game & related
		this.fetchGame(runid, run.game);
	}
	
	fetchGame(runid) {
		const gameid = this.records[runid].run.game;
		
		fetch(`${this.apiurl}/games/${gameid}`).then(
			res => res.json(),
			err => console.error(err)
		).then(game => {
			this.records[runid].game = game.data;
			
			this.fetchPlatform(runid);
		});
	}
	
	fetchUsers(runid, userid) {
		fetch(`${this.apiurl}/users/${userid}`).then(
			res => res.json(),
			err => console.error(err)
		).then(user => {
			this.records[runid].users.push(user.data);
		});
	}
	
	fetchSubcategories(subcatid, value, runid) {		
		fetch(`${this.apiurl}/variables/${subcatid}`).then(
			res => res.json(),
			err => console.error(err)
		).then(subcat => {			
			if (subcat.data['is-subcategory'] === false) {
				return;
			}
			
			this.records[runid].subcategories.push(subcat.data.values.values[value].label);
		});
	}
	
	fetchPlatform(runid) {
		const platformid = this.records[runid].run.system.platform;
		
		fetch(`${this.apiurl}/platforms/${platformid}`).then(
			res => res.json(),
			err => console.error(err)
		).then(platform => {
			this.records[runid].platform = platform.data;
			
			this.fetchCategory(runid);
		});
	}
	
	fetchCategory(runid) {
		const categoryid = this.records[runid].run.category;
		
		return fetch(`${this.apiurl}/categories/${categoryid}`).then(
			res => res.json(),
			err => console.error(err)
		).then(cat => {
			this.records[runid].category = cat.data;
			this.outputResult(runid);
		});
	}
	
	outputResult(runid) {
		const thisrun = this.records[runid];
			
		const {users, game, category, subcategories, platform, run} = this.records[runid];
		
		const usersstr = users.map(u => u.names.international).join(' & ');
		
		console.log(`World Record! ${usersstr} finished ${game.names.international} - ${[category.name].concat(subcategories).join('/')} (${platform.name}) on ${run.date} in ${this.parseTime(run.times.primary_t)}! ${run.weblink}`);
		// console.log(JSON.stringify(this.records[runid]));
	}
}

const sapi = new SpeedrunAPI();
sapi.fetchRuns();
