import {send, json} from 'micro-core';
import herokuVersionInfer from '@quarterto/heroku-version-infer';

const getJiraTicket = str => (/[A-Z]+-\d+/.exec(str) || [])[0];

export default async function(req, res) {
	return herokuVersionInfer('https://github.com/Financial-Times/google-amp.git', 'master');
}
