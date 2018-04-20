const logger = require('superagent-logger');

import request = require('superagent');
import { SuperAgentRequest } from 'superagent';

export class JiraApi {

    constructor(private config: JiraApiConfig) {}

    get(endpoint: string): SuperAgentRequest {
        return request
            .get(`${this.config.url}${endpoint}`)
            .auth(this.config.username, this.config.password)
            .accept('application/json');
    }

    post(endpoint: string, body: object): SuperAgentRequest {
        return request
            .post(`${this.config.url}${endpoint}`)
            .auth(this.config.username, this.config.password)
            .accept('application/json')
            .send(body);
    }

}

export interface JiraApiConfig {

    url: string;

    username: string;

    password: string;

}