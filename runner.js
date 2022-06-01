const { execSync, exec } = require('child_process');
const { watch, unlinkSync, existsSync, writeFileSync, appendFileSync } = require('fs');
const { join } = require('path');

let p;
let i = 0;

const Log = join(__dirname, 'a.log');
if (!existsSync(Log)) writeFileSync(Log, '');

function log(data) {
    console.log(data);
    let time = new Date().toLocaleTimeString();

    appendFileSync(
        Log,
        data
            .split('\n')
            .map(line => `[${time}]\t${line}\n`)
            .join('')
    );
}

function clear() {
    console.clear();
    unlinkSync(Log);
}

const compile = async () => {

    let cp = Number(i);
    await new Promise(ready => {
        if (!p) return ready();
        if (!p.kill()) console.log('Unable to kill last process');
        ready();
    })


    if (i !== cp) return;

    clear();
    log(`Compiling due to changes.`);
    try { execSync(`g++ ${join(__dirname, 'src', 'main.cpp')} -o ${join(__dirname, 'a.out')} -std=c++14`); }
    catch (e) {
        log(e.message);
        return log('\nFailed.');
    }

    log(`Running...`);
    p = exec(`${join(__dirname, 'a.out')} < ${join(__dirname, 'tests', 'basic.wi')}`);

    p.stdout.on('data', (data) => {
        log(data);
    });

    p.stderr.on('data', (data) => {
        log(data);
    });

    p.on('close', (code) => {
        log(`\nProgram exited with code ${code}.`);
    })

};

watch(join(__dirname, 'src'), compile);
compile();