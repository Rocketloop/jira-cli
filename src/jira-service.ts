import { JiraApi } from './jira-api';
import * as _ from 'lodash';
import ora = require('ora');
import moment = require('moment');

const MAX_RESULT_MAX = 1048576;

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

    getCurrentUser() {
        const promise = this.api.get('/rest/auth/1/session')
                            .then(result => {
                                return result.body;
                            });
        ora.promise(promise, 'Fetching current user');
        return promise;
    }

    getIssuesWorkedOn(user: string, date: moment.Moment, fields?: string) {
        const promise = this.api.get('/rest/api/2/search').query({
            'jql': `worklogAuthor = '${user}' AND worklogDate = '${date.format('YYYY-MM-DD')}'`,
            'fields': fields
        }).then(res => {
            return res.body.issues;
        });
        ora.promise(promise, 'Fetching worked on issues');
        return promise;
    }

    getWorklogsForIssue(issueId: string, showSpinner = true) {
        const promise = this.api.get(`/rest/api/2/issue/${issueId}/worklog`).query({
            'maxResults': MAX_RESULT_MAX
        }).then(result => {
            return result.body;
        });
        if (showSpinner) ora.promise(promise, 'Fetching worklog for issue');
        return promise;
    }

    getWorklogsForIssues(issueIds: string[]) {
        const promise = Promise.all(issueIds.map(issueId => this.getWorklogsForIssue(issueId, false)));
        ora.promise(promise, 'Fetching worklog for issues');
        return promise;
    }

    getWorklogsForUser(user: string, date: moment.Moment) {
        const isCurrentUser = (!user || user === 'me');
        const getCurrentUserPromise = (isCurrentUser) ? this.getCurrentUser() : Promise.resolve();
        let userName;
        return getCurrentUserPromise.then(currentUser => {
            userName = (isCurrentUser) ? currentUser.name : user;
            return this.getIssuesWorkedOn(userName, date, 'key');
        }).then(issues => {
            return this.getWorklogsForIssues(issues.map(issue => issue.key))
                          .then((logs: any[]) => {
                              return _.zipWith<any, any>(issues, logs, (issue, worklog) => {
                                  return {
                                      issue,
                                      worklogs: worklog.worklogs
                                  };
                              });
                          });
        }).then(issueWorklogs => {
            const worklogsByWithIssue = issueWorklogs.reduce((logs, issueWorklog) => {
                return [
                    ...logs, ...(issueWorklog.worklogs
                                             .map(worklog => {
                                                 return {
                                                     ...worklog,
                                                     issue: issueWorklog.issue,
                                                     started: moment(worklog.started)
                                                 };
                                             })
                                             .filter(worklog => {
                                                 return worklog.author.name === userName
                                                     && worklog.started.isSame(date, 'day');
                                             }))
                ].sort((a, b) => {
                    return a.started.isBefore(b.started) ? -1 : 1;
                });
            }, []);
            return worklogsByWithIssue;
        });
    }

}