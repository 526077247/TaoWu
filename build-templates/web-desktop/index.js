System.register(["./application.js"], function (_export, _context) {
  "use strict";

  var Application, canvas, div, $p, bcr, application,WIDTH,HEIGHT;
  function topLevelImport(url) {
    return System["import"](url);
  };
  function resizeCanvas() {
    var width = 0;
    var height = 0;
    if(window.innerHeight*WIDTH < window.innerWidth*HEIGHT){
      height = window.innerHeight;
      width = height*WIDTH/HEIGHT;
    }
    else{
      width = window.innerWidth;
      height = width*HEIGHT/WIDTH;
    }
    div.style.width = width + 'px';
    div.style.height = height + 'px';
    console.log(width)
  }
  return {
    setters: [function (_applicationJs) {
      Application = _applicationJs.Application;
    }],
    execute: function () {
      div = document.getElementById('GameDiv');
      canvas = document.getElementById('GameCanvas');
      WIDTH = canvas.width;
      HEIGHT = canvas.height;
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.position = "absolute"
      }else {
        div.style.position = "fixed"
        div.style.left = "50%"
        div.style.transform = "translateX(-50%)";

        window.addEventListener('resize', resizeCanvas, false);
        resizeCanvas()
      }
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      application = new Application();
      topLevelImport('cc').then(function (engine) {
        return application.init(engine);
      }).then(function () {
        return application.start();
      })["catch"](function (err) {
        console.error(err);
      });
    }
  };
});