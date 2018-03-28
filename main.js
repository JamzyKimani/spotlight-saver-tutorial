const {app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs') 
const os = require('os');
const Jimp = require("jimp")
const wallpaper = require('wallpaper')
const AutoLaunch = require('auto-launch');

var appAutoLauncher = new AutoLaunch({
    name: 'spotlight-saver',
    isHidden: true,
  });

appAutoLauncher.isEnabled()
.then(function(isEnabled){
    if(isEnabled){
        return;
    }
    appAutoLauncher.enable();
})
.catch(function(err){
    console.log(err)
});

var username = os.userInfo().username; //gets the username of the os's logged in user
var spotlightFolder = `C:/Users/${username}/AppData/Local/Packages/Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy/LocalState/Assets`;

var appImgsFolder = createImagesFolder();
function createImagesFolder() {
    let defaultImagesFolderPath = (app.getPath('pictures')+'/Spotlight_Images').replace(/\\/g, '/'); 
                                            //replaces "frontlaces" with backslashes ^^^                           
    //check if default folder already exists
    if(!fs.existsSync(defaultImagesFolderPath)) { 
      //make images folder if it does not exist
      fs.mkdirSync(defaultImagesFolderPath, '0o765') 
      return defaultImagesFolderPath;
    } else { 
      //return default folder if it already exists
      return defaultImagesFolderPath; 
    }
}


let win

var startupArgs = process.argv || [];

function createWindow () {
    
    if(startupArgs.indexOf('--hidden') == -1) {
        //this is a normal user-initiated startup
        // Create the browser window.
        win = new BrowserWindow({width: 800, height: 600})

        // and load the index.html of the app.
        win.loadURL(url.format({
            pathname: path.join(__dirname, './src/index.html'),
            protocol: 'file:',
            slashes: true
        }))
        // uncomment next line to Open the DevTools.
        //win.webContents.openDevTools()
        // Emitted when the window is closed.
        win.on('closed', () => {
            win = null
        })
        //removes default main menu for the app
        Menu.setApplicationMenu(null);
        updateImagesFolder(appImgsFolder, spotlightFolder)
        
        win.webContents.on('did-finish-load', () => {
            //get the filenames in the images folder after it has been updated above
            var imgsFolderFiles =  fs.readdirSync(appImgsFolder);
            //payload defines a message we can send to the ui window
            var payload = {imgsFolder : appImgsFolder, imgsFolderFiles : imgsFolderFiles }
            //the path to the images folder and the files inside it are sent
            win.webContents.send('refreshImages', payload );
        })
    } else {
        //auto-launcher started the app;
        //this is a silent startup, notice we don't load any url here
        console.log('App is started by AutoLaunch');
        const iconName = 'app-icon.png';
        const iconPath = path.join(__dirname, iconName)
        appIcon = new Tray(iconPath)
        appIcon.setToolTip(`Getting Windows Spotlight Images. This won't take long :)`)
        updateImagesFolder(appImgsFolder, spotlightFolder)
        .then(setTimeout(function(){ app.quit(); }, 10000))
           
    }
    
}
app.on('ready', createWindow)
// Quit when all windows are closed.
app.on('window-all-closed', () => {
    //no need to check for darwin (macOS) this is a windows only app
    app.quit()
})
app.on('activate', () => {
    if (win === null) {
    createWindow()
}
})

async function updateImagesFolder(appImgsFolder, spotlightFolder) {
    //below vars store an array of filenames in the respective folders
    var spotlightFolderFiles = fs.readdirSync(spotlightFolder);
    var imgsFolderFiles = fs.readdirSync(appImgsFolder);

    var promises=[]; //will store an array of promises for a Promise.all func
    spotlightFolderFiles.forEach(file => {
        promises.push(readAnonymFile(`${spotlightFolder}/${file}`))
    })

    await Promise.all(promises)
      .then(results => {
        //results is an array with both non image files marked with status 'reject' and image files
        //images filters results for only image files... however even icons are img files
        var images = results.filter(result => result.status === 'resolve')
        
        images.forEach(imgFile => {
            let filename = imgFile.file;
            let imgObj = imgFile.image;
            let w = imgObj.bitmap.width; // the width of the image 
            let h = imgObj.bitmap.height; //height of image
            //check if image is rectangular and width is big enuf to be wallpaper
            if (h<w && w>1000 && imgsFolderFiles.indexOf(`${filename}.jpg`) == -1 ) { 
                imgObj.write(`${appImgsFolder}/${filename}.jpg`, function(){
                    // save file to images folder and log if successfull
                    console.log('found a wallpaper image')
                }); 
            }
        })

      })
      .catch(error => {
          console.log(error)
      })

}

function readAnonymFile(imagePath) {
  return new Promise ((resolve, reject) => {
    var filename = path.basename(imagePath);
    Jimp.read(imagePath, function (err, img) {
        if (err)  {
            resolve({error: 'file is not an img.', file: filename, status: 'reject' })
        } else if (img) {
            resolve({image: img, file: filename, status: 'resolve' })
        } else {
            //this will virtually never happen 
            reject('function failed')
        }
    });
      
  })
}

ipcMain.on('changeDesktopWallpaper',(event, imgPath) => {
    wallpaper.set(imgPath)
})

ipcMain.on('openImagesFolder', event => {
    shell.openItem(appImgsFolder);
})

ipcMain.on('showAboutInfo', event => {
    const options = {
      type: 'info',
      title: 'Windows Lockscreen Image Saver',
      message: 'About Software',
      detail: 
`
App Version   :   1.0.0
Developed by  :   James Kimani
                  https://github.com/JamzyKimani
                  https://twitter.com/JamzyKimani

`   ,
      buttons: ['OK']
    }
    dialog.showMessageBox(options);
  })