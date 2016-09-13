import {send, json} from 'micro-core';
import herokuVersionInfer from '@quarterto/heroku-version-infer';
import route from 'boulevard';
import HttpStatus, {MethodNotAllowed, ImATeapot} from 'http-errors';
import pkg from './package.json';
import test from '@quarterto/await-test';
import jiraSetVersion from '@quarterto/jira-set-version';
import assertHerokuEnv from '@quarterto/assert-heroku-env';
import fs from 'fs';

assertHerokuEnv();

const getJiraTicket = str => (/[A-Z]+-\d+/.exec(str) || [])[0];

export default route({
	async '/' (req, res) {
		await test(() => req.method === 'POST', MethodNotAllowed);
		await test(() => req.headers['x-github-event'] === 'pull_request', new ImATeapot('Not a pull request'));
		const data = await json(req);

		await test(() => data.action === 'closed' && data.pull_request.merged, new HttpStatus(200, 'Pull request not closed'));

		const ticket = getJiraTicket(data.pull_request.head.ref) || getJiraTicket(data.pull_request.title);
		await test(
			() => !!ticket,
			new HttpStatus(200, `No ticket id in branch name "${data.pull_request.head.ref}" or PR title "${data.pull_request.title}"`)
		);

		const version = `${data.repository.name}-${await herokuVersionInfer(data.repository.clone_url, 'master')}`;
		await jiraSetVersion({ticket, version}, {
			hostname: process.env.JIRA_HOST,
			user: process.env.JIRA_USER,
			pass: process.env.JIRA_PASS,
		});

		return `${ticket} fix version set to ${version}`;
	},

	async '/__about' (req, res) {
		send(res, 200, {
			appVersion: pkg.version,
			audience: 'internal',
			schemaVersion: 1,
			contacts: [{
				email: 'matthew.brennan@ft.com',
				name: 'Matt Brennan',
			}],
			primaryUrl: `http://${process.env.HEROKU_APP_NAME}.herokuapp.com`,
			dateDeployed: process.env.HEROKU_RELEASE_CREATED_AT,
			purpose: 'Github webhook to update JIRA tickets with fixversions',
			serviceTier: 'bronze',
		});
	}
});
