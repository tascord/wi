const { execSync, exec } = require('child_process');
const { watch } = require('fs');
const { join } = require('path');

let p;
let i = 0;

const compile = async () => {

    let cp = Number(i);
    await new Promise(ready => {
        if (!p) return ready();
        if (!p.kill()) console.log('Unable to kill last process');
        ready();
    })

    if (i !== cp) return;

    console.clear();
    console.log(`Compiling due to changes.`);
    try { execSync(`g++ ${join(__dirname, 'src', 'main.cpp')} -o ${join(__dirname, 'a.out')} -std=c++14`); }
    catch (e) {
        console.log(e.message);
        return console.log('\nFailed.');
    }

    console.log(`Running...`);
    p = exec(`${join(__dirname, 'a.out')} < ${join(__dirname, 'tests', 'basic.wi')}`);

    p.stdout.on('data', (data) => {
        console.log(data);
    });

    p.stderr.on('data', (data) => {
        console.log(data);
    });

    p.on('close', (code) => {
        console.log(`\nProgram exited with code ${code}.`);
    })

};

watch(join(__dirname, 'src'), compile);
compile();