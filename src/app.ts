import { JiraApi } from './jira-api';
import { JiraService } from './jira-service';
import * as CliTable2 from 'cli-table2';
import { bold } from 'colors/safe';
import Conf = require('conf');
import * as inquirer from 'inquirer';
import moment = require('moment');
import chrono = require('chrono-node');
import { displayNumber, displayText } from './display.helper';


export class App {

    api: JiraApi;

    config: Conf;

    service: JiraService;

    constructor() {

    }

    initialize(): Promise<App> {
        return this._loadConfig().then(() => {
            this._initializeApi();
            this._initializeService();
            return this;
        });
    }

    backlog(project: string) {
        this.service.getSprintsForProject(project).then(sprints => {
                return sprints.filter(sprint => sprint.state !== 'closed')
            })
            .then(sprints => {
                const table: Array<any> = new CliTable2({
                    head: ['ID', 'Sprint']
                });
                sprints.forEach(sprint => {
                    table.push([sprint.id, sprint.name]);
                });
                console.log(table.toString());
            });
    }

    board(project: string, onlyMine?: boolean) {
        this.service.getDisplayBoardForProject(project, onlyMine).then(board => {
            const maxWidth = (process.stdout.columns || 80) - board.length;
            const table: Array<any> = new CliTable2({
                head: board.map(column => column.name),
                colWidths: board.map(column => {
                    return Math.round(maxWidth/board.length);
                })
            });
            const maxIssues = board.reduce((max, column) => {
                return Math.max(max, column.issues.length);
            }, 0);
            for (let i = 0; i < maxIssues; i++) {
                table.push(board.map(column => {
                    const issue = column.issues[i];
                    if (issue) {
                        return `${bold(issue.key)}\n${issue.fields.summary}`;
                    } else {
                        return '';
                    }
                }));
            }
            console.log(table.toString());
        });
    }

    worklog(user = 'me', date?: string) {
        const parsedDate = (date) ? moment(chrono.parseDate(date)) : moment();
        this.service.getWorklogsForUser(user, parsedDate).then(worklogs => {
            const maxWidth = (process.stdout.columns || 80) - 5;
            const maxLineWidth = worklogs.reduce((maxLine, worklog) => {
                return worklog.comment.split('\r\n').reduce((maxLine, line) => {
                    return Math.max(maxLine, line.length);
                }, maxLine);
            }, 0);
            const commentWidth = Math.min(Math.max(maxWidth - 44, 0), maxLineWidth + 2);
            const table: Array<any> = new CliTable2({
                head: ['Time', 'Duration', 'Issue', 'Description'],
                colWidths: [22, 10, 12, commentWidth]
            });
            let totalTime = 0;
            worklogs.forEach(worklog => {
                const duration = moment.duration(worklog.timeSpentSeconds, 'seconds');
                table.push([
                    `${worklog.started.format('LT')} - ${worklog.started.add(worklog.timeSpentSeconds, 'seconds').format('LT')}`,
                    `${displayNumber(duration.asHours())}h`,
                    worklog.issue.key,
                    displayText(worklog.comment.replace(/\r/g, ''), commentWidth - 2)]);
                totalTime += worklog.timeSpentSeconds;
            });
            const duration = moment.duration(totalTime, 'seconds');
            table.push([
                bold('Total'),
                bold(`${displayNumber(duration.asHours())}h`),
                '',
                ''
            ]);
            console.log(table.toString());
        });
    }

    log(issue: string, duration: number, start = new Date(), message?: string) {
        this.service.addWorkLogToIssue(issue, duration, start, message).then(response => {
            // do nothing
        });
    }

    init(): Promise<string> {
        return inquirer.prompt([
            {
                type: 'input',
                name: 'url',
                message: 'Enter your Jira URL'
            },
            {
                type: 'input',
                name: 'username',
                message: 'Enter your Jira username'
            },
            {
                type: 'password',
                name: 'password',
                message: 'Enter your Jira password'
            }
        ]).then(answers => {
            this.config.set('api', answers);
            this.config.set('initialized', true);
            return 'Initialization successful';
        });
    }

    private _loadConfig(): Promise<Conf> {
        this.config = new Conf({
            encryptionKey: 'sdfyu7y3irfsov869wuvut7sdiyfuk'
        } as any);
        const initialized = this.config.get('initialized');
        if (!initialized) {
            return this.init().then(_ => this.config);
        } else {
            return Promise.resolve(this.config);
        }
    }

    private _initializeApi() {
        this.api = new JiraApi(this.config.get('api'));
    }

    private _initializeService() {
        this.service = new JiraService(this.api);
    }

}