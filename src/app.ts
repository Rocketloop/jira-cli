import { JiraApi } from './jira-api';
import { JiraService } from './jira-service';
import * as CliTable2 from 'cli-table2';
import { bold } from 'colors/safe';
import Conf = require('conf');
import * as inquirer from 'inquirer';
import moment = require('moment');
import chrono = require('chrono-node');
import { displayNumber, displayText } from './display.helper';

/**
 * The main app class
 */
export class App {

    /**
     * The api object used to communicate with Jira
     */
    api: JiraApi;

    /**
     * The app's configuration
     */
    config: Conf;

    /**
     * The JiraService that abstracts the actual logic to load data from and interact with Jira
     */
    service: JiraService;

    constructor() {

    }

    /**
     * Initialize the application
     */
    initialize(isLogin: boolean): Promise<App> {
        return this._loadConfig(isLogin).then(() => {
            this._initializeApi();
            this._initializeService();
            return this;
        });
    }

    /**
     * Load the backlog of the given project and display it
     * @param project
     */
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

    /**
     * Load the board of the active sprint of the given project and display it
     * @param project
     * @param onlyMine
     */
    board(project: string, onlyMine?: boolean) {
        this.service.getDisplayBoardForProject(project, onlyMine).then(board => {
            const maxWidth = (process.stdout.columns || 80) - board.length;
            const table: Array<any> = new CliTable2({
                head: board.map(column => column.name),
                colWidths: board.map(column => {
                    return Math.round(maxWidth / board.length);
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

    /**
     * Load the work log of the given user for the given date ad display it
     * @param user
     * @param date
     */
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

    /**
     * Log a new work entry to the given issue
     * @param issue
     * @param duration
     * @param start
     * @param message
     */
    log(issue: string, duration: number, start = new Date(), message?: string) {
        this.service.addWorkLogToIssue(issue, duration, start, message).then(response => {
            // do nothing
        });
    }

    /**
     * Guide the user through the initial setup
     */
    login(force?: boolean): Promise<void> {
        if (!this.config.get('loggedIn') || force) {
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
                this.config.set('loggedIn', true);
            });
        } else {
            console.log('CLI already initialized. To overwrite current config, rerun with \'--force\'');
            return Promise.resolve();
        }
    }

    public resetConfig(): void {
        this.config.clear();
    }

    public askYesNoPrompt(): Promise<boolean> {
        return inquirer.prompt<any>([
            {
                type:'confirm',
                name:'continue',
                message: 'Are you sure you want to procced',
                default: false
            }
        ]).then(answers => {
            return answers.continue;
        });
    }


    private _loadConfig(isLogin: boolean): Promise<Conf> {
        this.config = new Conf();
        const loggedIn = this.config.get('loggedIn');
        if (!loggedIn && !isLogin) {
            return this.login().then(_ => this.config);
        } else {
            return Promise.resolve(this.config);
        }
    }

    /**
     * Inititalize the JiraApi interface
     * @private
     */
    private _initializeApi() {
        this.api = new JiraApi(this.config.get('api'));
    }

    /**
     * Initialize the JiraService
     * @private
     */
    private _initializeService() {
        this.service = new JiraService(this.api);
    }

}