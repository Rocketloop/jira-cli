import * as commander from 'commander';
import { App } from './app';
import { parsedDurationToSeconds, parseDuration, parseTimeOfDay } from './time.helper';


function getApp(isLogin = false): Promise<App> {
    return new App().initialize(isLogin);
}

commander.command('login')
         .description('Enter Jira credentials')
         .option('-f, --force', 'Force the CLI to overwrite the current login information')
         .action((cmd) => {
             getApp(true).then(app => {
                 app.login(cmd.force);
             });
         });

commander.command('logout')
         .description('Reset the previously entered Jira credentials')
         .option('-s, --silent', 'Proceedes without user input')
         .action((cmd)=> {
             getApp(true).then( async app=> {
                 if (app.config.size === 0) {
                     return;
                 }
                 if(cmd.silent || await app.askYesNoPrompt()) {
                     app.resetConfig();
                     console.log('✅ Logged out');
                 }
             });
         });

commander.command('backlog <project>').action((project) => {
    getApp().then(app => {
        app.backlog(project);
    });
});

commander.command('board <project>')
         .description('Display the current sprint of the primary board of the specified project')
         .option('-m, --mine', 'Only show issues assigned to me')
         .action((project, cmd) => {
             getApp().then(app => {
                 app.board(project, cmd.mine);
             });
         });

commander.command('worklog')
         .description('Display the worklog of a given user for a given day')
         .option('-u, --user <user>',
             'Specified which user the work logs should be shown for, default to the current user'
         )
         .option('-d, --date <date>', 'Specifies which date the work logs should be shown for, defaults to today')
         .action((cmd) => {
             getApp().then(app => {
                 app.worklog(cmd.user, cmd.date);
             });
         });

commander.command('log <issue> <duration>')
         .description('Create a new worklog entry for the given issue')
         .option('-m, --message <value>', 'The message for this work log')
         .option('-s, --start <time>', 'The start time for this work log, or now')
         .action((issue, duration, cmd) => {
             getApp().then(app => {
                 const parsedDuration = parseDuration(duration);
                 if (parsedDuration) {
                     let parsedStartTime;
                     if (cmd.start) {
                         parsedStartTime = parseTimeOfDay(cmd.start);
                     }
                     app.log(issue, parsedDurationToSeconds(parsedDuration.value, parsedDuration.unit), parsedStartTime,
                         cmd.message
                     );
                 } else {
                     console.log('Please enter a valid duration.');
                 }
             });
         });

commander.parse(process.argv);

if (process.argv.length <= 2 ) {
    commander.outputHelp();
}
