var app = require('app'); // Module to control application life.
var express = require('express');
var exapp = express();
var fs = require('fs');
var https = require('https');
var launcherCode = '';
var path = require('path');
var portscanner = require('portscanner');
var path_to_public = __dirname + '/public/';
var scriptsToLoad = {}
var oldUsername = '';
var regex = /^(?=.*?names\ \=\ \[).*$/m;
var BrowserWindow = require('browser-window'); // Module to create native browser window.

function writeLauncher(codeToWrite) {
    fs.writeFile(__dirname + '/public/scripts/launcher.user.js', codeToWrite, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function isPortTaken(port, callback) {
    portscanner.checkPortStatus(port, '127.0.0.1', function (error, status) {
        console.log(status)
        if (error) console.log(error)
        if (status === 'open') {
            callback(false);
        } else {
            callback(true);
        }
    })
}

function writeUsername(usr) {
    fs.writeFile(__dirname + '/public/user', usr, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function updateBotList() {
    scriptsToLoad = fs.readdirSync(__dirname + '/public/scripts');
    for (var i = 0; i < scriptsToLoad.length; i++) {
        if (scriptsToLoad[i].indexOf('disabled') > -1) {
            scriptsToLoad.splice(i, 1);
        }
    }
}

function readLauncher() {
    fs = require('fs')
    fs.readFile(__dirname + '/public/scripts/launcher.user.js', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        launcherCode = data;
    });
}

function readUsername() {
    fs = require('fs')
    fs.readFile(__dirname + '/public/user', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        oldUsername = data;
    });
}

exapp.use(express.static(__dirname + '/public'));

isPortTaken(3000, function(isAvailable){
    if(isAvailable === true){
        exapp.listen(3000, function (err) {
            if (err) {
                return;
            }
            console.log(new Date() + ': Server started on port 3000');
        });
    }else{
        console.warn('Server already running on port 3000')
    }
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});
var ipc = require('ipc');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
    var agario = createBrowser('http://agar.io/', false, 800, 600);
    agario.setSkipTaskbar(true);
    agario.minimize();
    agario.setMenuBarVisibility(false);
    readLauncher();

    var local = createBrowser('http://localhost:3000/dist/index.html', true, 800, 600);
    readUsername();
    local.setMenuBarVisibility(false)
    ipc.on('oldUsername', function (event, arg) {
        event.returnValue = oldUsername;
    });


    ipc.on('showagario', function (event, arg) {

        console.log('Showing agario');
        //readUsername();

        writeLauncher(launcherCode.replace(regex, '                names = ["' + arg[0] + '"],'));
        writeUsername(arg[0]);
        agario.restore();
        agario.setSkipTaskbar(false);
        setTimeout(function () {
            if (arg[1] === true) {
                loadBot(agario);
            } else {
                loadNoBot(agario, arg[0]);
            }
        }, 500);
        local.close();
    });

    function loadBot(win) {
        updateBotList();
        for (var i = 0; i < scriptsToLoad.length; i++) {
            console.log(scriptsToLoad[i]);
            (function (index) {
                setTimeout(function () {
                    win.webContents.executeJavaScript("var head=document.getElementsByTagName('head')[0],script=document.createElement('script');script.type='text/javascript',script.src='http://localhost:3000/scripts/" + scriptsToLoad[index] + "',head.appendChild(script);")
                }, i * 500);
            })(i);

        }

    }

    function loadNoBot(win, username) {
        //TODO: Launch game but not bot here. Find right scripts.
        win.webContents.executeJavaScript("document.getElementById('nick').value = '" + username + "'");
        win.webContents.executeJavaScript("setTimeout(setNick(document.getElementById('nick').value),750);");
    }

    function createBrowser(url, nodeIntegration, w, h) {
        var mainWindow = null;
        // Create the browser window.
        mainWindow = new BrowserWindow({
            width: w,
            height: h,
            "node-integration": nodeIntegration
        });

        // and load the index.html of the app.
        mainWindow.loadUrl(url);


        // Open the devtools.
        //mainWindow.openDevTools();

        // Emitted when the window is closed.
        mainWindow.on('closed', function () {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            mainWindow = null;
        });
        return mainWindow;
    }
});
