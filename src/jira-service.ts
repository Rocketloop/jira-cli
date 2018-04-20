import { JiraApi } from './jira-api';
import ora = require('ora');
import moment = require('moment');


export class JiraService {

    constructor(private api: JiraApi) {}

    getBoardsForProject(projectKey: string): Promise<any[]> {
        const promise = this.api.get('/rest/agile/1.0/board')
                            .query({ projectKeyOrId: projectKey })
                            .then<any[]>(res => {
                                return res.body.values;
                            });
        ora.promise(promise, `Fetching boards for project`);
        return promise;
    }

    getConfigForBoard(boardId: string) {
        const promise = this.api.get(`/rest/agile/1.0/board/${boardId}/configuration`)
                            .then<any[]>(res => {
                                return res.body;
                            });
        ora.promise(promise, `Fetching boards config`);
        return promise;
    }

    getSprintsForBoard(boardId: string, state?: string): Promise<any[]> {
        let request = this.api.get(`/rest/agile/1.0/board/${boardId}/sprint`);
        if (state) request = request.query({ 'state': 'active' });
        const promise = request.then<any[]>(res => {
            return res.body.values;
        });
        ora.promise(promise, `Fetching sprints for board`);
        return promise;
    }

    getSprintsForProject(projectKey: string) {
        return this.getBoardsForProject(projectKey).then(boards => {
            return this.getSprintsForBoard(boards[0].id);
        });
    }

    getCurrentSprintForProject(projectKey) {
        return this.getBoardsForProject(projectKey)
                   .then(boards => {
                       return this.getSprintsForBoard(boards[0].id, 'active');
                   })
                   .then(sprints => {
                       return sprints.pop();
                   });
    }

    getIssuesForSprint(sprintId, onlyMine): Promise<any[]> {
        let request = this.api.get(`/rest/agile/1.0/sprint/${sprintId}/issue`);
        if (onlyMine) request = request.query({ 'jql': 'assignee = currentUser()' });
        const promise = request.then<any[]>(res => {
            return res.body.issues;
        });
        ora.promise(promise, `Fetching issues for sprint`);
        return promise;
    }

    getDisplayBoardForProject(projectKey: string, onlyMine?: boolean) {
        let board;
        let config;
        let sprint;
        let issues;
        return this.getBoardsForProject(projectKey).then(boards => {
            board = boards[0];
            return Promise.all([this.getSprintsForBoard(board.id, 'active'), this.getConfigForBoard(board.id)]);
        }).then(([sprints, c]) => {
            config = c;
            sprint = sprints.pop();
            return this.getIssuesForSprint(sprint.id, onlyMine);
        }).then((issues: any[]) => {
            return config.columnConfig.columns.map(column => {
                const positiveStatusIds = column.statuses.map(status => status.id);
                return {
                    name: column.name,
                    issues: issues.filter(issue => {
                        return ~positiveStatusIds.indexOf(issue.fields.status.id);
                    })
                };
            });
        });
    }

    addWorkLogToIssue(issueKey: string, duration: number, start: Date, message?: string) {
        const body = {
            started: moment(start).format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ'),
            timeSpentSeconds: duration,
            comment: message
        };
        const promise = this.api.post(`/rest/api/2/issue/${issueKey}/worklog`, body)
                            .then<any[]>(res => {
                                return res.body;
                            });
        ora.promise(promise, `Adding work log`);
        return promise;
    }

}