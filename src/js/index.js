const {ipcRenderer, electron} = require('electron');
const WinJS = require('winjs')

function refreshImages(imagesFolder, imgsFolderFiles) {
    var imgsHTML = '';
    if (imgsFolderFiles.length>0) { // if images folder has files 
        //loop through each of the files 
        imgsFolderFiles.forEach(imageFile => {
        //make a div tag that renders the images as the div background image
        imgsHTML += `<div class="gallery-img" style="background-image: url('${imagesFolder}/${imageFile}'); background-size: 100% 100%;" onmouseout="hideWallpaperBtn(this)" onmouseover="showWallpaperBtn(this)">
                        <button class="btn info" onclick="setAsWallpaper('${imagesFolder}/${imageFile}')">Set as Desktop Wallpaper</button>
                     </div>  
                    `                
        });

    } else {
         // show a message if the user does not have any pics ... usually because Windows Spotlight is not activated
        imgsHTML += `<div class="center msg" id="msg_area">
                        <p>No Windows Spotlight Images were found on your computer. </p>
                        <p>go to personalization settings and check if Spotlight is enabled under lock screen tab and <a href="#" onclick="refreshImages()">refresh</a></p>
                    </div>`
    }

    var imgsArea = document.getElementById('imgs-area');
    if (imgsHTML != '') { imgsArea.innerHTML = imgsHTML; }
}

ipcRenderer.on('refreshImages', (event, payload) => {
    //this code listens for the 'refreshImages' event sent in the main.js file under the createWindow func
    console.log(payload)
    refreshImages(payload.imgsFolder, payload.imgsFolderFiles) //this func is defined above
})

WinJS.UI.processAll().done(function () {
    var splitView = document.querySelector(".splitView").winControl;
    new WinJS.UI._WinKeyboard(splitView.paneElement); // Temporary workaround: Draw keyboard focus visuals on NavBarCommands
});

function setAsWallpaper(file) {
    console.log('will set '+file+' as wallpaper');
    ipcRenderer.send('changeDesktopWallpaper',  file);
}

function showWallpaperBtn(div) {
  var wallpaperBtn = div.querySelector('button');
  wallpaperBtn.style.opacity = '1';
  wallpaperBtn.style.height = '50px';
}

function hideWallpaperBtn(div) {
    var wallpaperBtn = div.querySelector('button');
    wallpaperBtn.style.height = '0px';
    wallpaperBtn.style.opacity= '0';
}

document.getElementById('openFolderBtn').addEventListener('click', function(){
    ipcRenderer.send('openImagesFolder')
})

document.getElementById('aboutSoftwareBtn').addEventListener('click', function(){
    ipcRenderer.send('showAboutInfo')
})

