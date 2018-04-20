import * as commander from 'commander';
import { App } from './app';
import { parsedDurationToSeconds, parseDuration, parseTimeOfDay } from './time.helper';

function getApp(): Promise<App> {
    return new App().initialize();
}

commander.command('backlog <project>').action((project) => {
    getApp().then(app => {
        app.backlog(project);
    });
});

commander.command('board <project>')
         .option('-m, --mine', 'Only show issues assigned to me')
         .action((project, cmd) => {
             getApp().then(app => {
                 app.board(project, cmd.mine);
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