var checkerboard;
var ctx;
var canvas;
var running = false;

var gyroPos = new THREE.Vector3();
var sensorPos = new THREE.Quaternion();

var thumbstickMoving = false;

var sceneNumber = 0;
var prev_time = 0;

var responses = [];
var contrast = 1, position = [0, 0, -150];
var stimulusOn = -1, stimulusOff = -1;

var positionVariation = 70;

var acceptingResponses = false;

var doubleQuit = false;

var backgroundColor = "#7F7F7F";

var loc = [[0,0], [-1, 1], [0, 1],[1, 1], [-1, 0], [1, 0], [-1,-1], [0, -1], [1, -1]];
var angle_pos = [0, -45, 90, 45, 0, 0, 45, 90, -45];
var counter = 0;
var angle = 0;
var Imax = 132;
var Imin = 122;
var frequency = 0;
var location_adjusted = false;
var frequency = 0.02;
var std = 12;
var max_freq = 0.03;
var step_freq= 0.05;

/*Registers controller button pressed */
AFRAME.registerComponent('button-listener', {
    init: function () {
        var el = this.el;

        el.addEventListener('abuttondown', function (evt) {
            if (acceptingResponses){
                newTrial(true);
            }
        });

        el.addEventListener('bbuttondown', function (evt) {
            var gabor = createGabor(100, frequency, 0, std, 0.5, 1);
            $("#gabor").html(gabor);
            rr = gabor.toDataURL("image/png").split(';base64,')[1];
            document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
        });
      
        el.addEventListener('gripdown', function (evt) {
            if (doubleQuit == false) {
                doubleQuit = true;
                setTimeout(function () {
                    doubleQuit = false;
                }, 1000);
            }
            else {
                document.querySelector('a-scene').exitVR();
                location.reload();
            }
        });
    }
});


/* Controller thumbstick actions */
AFRAME.registerComponent('thumbstick-logging', {
    init: function () {
        this.el.addEventListener('thumbstickmoved', this.logThumbstick);
        this.el.addEventListener('thumbsticktouchstart', function () {
            thumbstickMoving = true;
        });
        this.el.addEventListener('thumbsticktouchend', function () {
            thumbstickMoving = false;
        });
    },
    logThumbstick: function (evt) {
        if (acceptingResponses){
            if (evt.detail.y > 0.95 || evt.detail.x > 0.95) {
                updateGabor(-1, 1);
            }
            if (evt.detail.y < -0.95 || evt.detail.x < -0.95) { 
                updateGabor(1, -1);
            } 
        }
    }
});


function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

$(document).ready(function () {
    addAlignmentSquares();


    $("#fullscreen").click(function (event) {
        toggleFullScreen();
    });

    $("#main").append('<a-plane id="noise-vr" material="transparent:true;opacity:0" width="200" height="200" position="0 0 -150.1"></a-plane>');

    $("#main").append('<a-plane id="opaque-vr" material="color:' + backgroundColor + '; transparent:true;opacity:1" width="200" height="200" visible="false" position="0 0 -49.1"></a-plane>');

    /* Adjusting the frequency, max frequency, std, and step frequency based on depth of 150m*/
    frequency = parseFloat($("#frequency").val())/26;
    std = parseFloat($("#size-std").val())*10;
    max_freq = parseFloat($("#max-frequency").val())/26;
    step_freq= parseFloat($("#step-frequency").val())/26;

    var gabor = createGabor(100, frequency, 0, 10, 0.5, 1);

    $("#gabor").append(gabor);
    rr = gabor.toDataURL("image/png").split(';base64,')[1];
    $("#main").append('<a-plane id="gabor-vr" material="src:url(data:image/png;base64,' + rr + ');transparent:true;opacity:1" width="10" height="10" position="0 0 -150"></a-plane>');

    // cues around target
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 -7 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 7 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="7 0 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="-7 0 -150"></a-plane>');

    //trials
    num_trials = Math.floor((max_freq-frequency)/step_freq) + 1;
    trial_num();

    stimulusOn = Date.now();
    acceptingResponses = true;
    
    $("#info").on("keypress", function (e) {
        e.stopPropagation();
    });

    /* Registers keyboard input a->97 (increase contrast) and b->98 (decrease contrast) */
    $(document).on('keydown keyup keypress', function (event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);

        if (acceptingResponses) {
            if (keycode == 97) {
                newTrial(true);
            } else if (keycode == 98) {
                Imax = 132;
                Imin = 122;
                var gabor = createGabor(100, frequency, angle, std, 0.5, 1);
                $("#gabor").html(gabor);
                rr = gabor.toDataURL("image/png").split(';base64,')[1];
                document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
            }
            else if (keycode==38){
                updateGabor(1, -1);
            }
            else if (keycode==40){
                updateGabor(-1, 1);
            }
        }
    });

    $("#myEnterVRButton").click(function () {
        stimulusOn = Date.now();
    });

    /* If target st dev changed, we update the angle of the target based on current location 
    and type of experiment (9 loc, random loc, or static loc). We also
    convert new st dev value to units we want and redraw target gabor */
    $("#size-std").keyup(function () {
        if ($("#fixed-position").prop("checked")) {
            angle = angle_pos[counter];
        }
        std = parseFloat($("#size-std"))* 10;
        var gabor = createGabor(100, frequency, angle,std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

/* If frequency changed, we update the angle of the target based on current location 
    and type of experiment (9 loc, random loc, or static loc). We also
    convert new frequency value to units we want, recalculate total trials, and redraw target gabor */
    $("#frequency").change(function () {
        if ($("#fixed-position").prop("checked")) {
            angle = angle_pos[counter];
        }
        frequency=  parseFloat($("#frequency").val())/26;
        trial_num();
        var gabor = createGabor(100, frequency, angle, std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

/* If max freq changed we recalculate total trials and convert new max frequency to units we want  */
    $("#max-frequency").change(function () {
        max_freq= parseFloat($("#max-frequency").val())/26;
        trial_num();
    });

/* If step freq changed we recalculate total trials and convert new step frequency to units we want  */
    $("#step-frequency").change(function () {
        step_freq= parseFloat($("#step-frequency").val())/26;
        trial_num();
    });

    /* If distance between targets is updated, recalculate target positions */
    $("#distance").change(function () {
        distance = parseFloat($("#distance").val());
        index = 0;
        while (index < loc.length){

            loc[index][0] *= distance;
            loc[index][1] = loc[index][1] * distance;
            index+=1;    
     }
     location_adjusted = true;

    });

     $("#fixed-position").change(function () {
        trial_num();
     });
    
     $("#random-location").change(function () {
        trial_num();
     });   

    $("#background-noise").change(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $("#gaussian-sigma").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $("#noise-params").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $('#background-color').minicolors({
        control: 'hue',
        change: function () {
            backgroundColor = $('#background-color').val();
            $("#sky").attr("color", backgroundColor);
            $("#opaque-vr").attr("color", backgroundColor);
        },
    });

});

/* Calculates new location based on distance */
function updateLocation(){
    distance = parseFloat($("#distance").val());
    index = 0;
    while (index < loc.length){
        loc[index][0] *= distance;
        loc[index][1] = loc[index][1] * distance;
        index+=1;    
    }
    location_adjusted = true;
}

/* Adjusts contrast*/
function updateGabor(max, min){
    Imax += max;
    if (Imax % 2 == 0){
        Imin+=min;
    }
    contrast = (Imax - Imin)/ (Imax + Imin);
    var gabor = createGabor(100, frequency, angle, std, 0.5, contrast);
    $("#gabor").html(gabor);
    rr = gabor.toDataURL("image/png").split(';base64,')[1];
    document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
}

async function showNoise() {
    if ($("#background-noise").prop("checked"))
        var noise = await createNoiseField(1000, 128, parseFloat($("#noise-sigma").val()), parseFloat($("#gaussian-sigma").val()));

    return new Promise(resolve => {
        if ($("#background-noise").prop("checked")) {
            $("#noise-params").show();
            rr = noise.toDataURL("image/png").split(';base64,')[1];
            document.getElementById("noise-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
        } else {
            $("#noise-params").hide();
        }
        resolve();
    });
}

function addAlignmentSquares(n = 10) {
    for (row = 0; row < n / 2; row++) {
        for (col = 0; col < n / 2; col++) {
            x = col * 0.05;
            y = row * 0.05;
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ x + ' ' + y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ -x + ' ' + y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ x + ' ' + -y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ -x + ' ' + -y + ' -1" ></a-entity>');
        }
    }
}

function createNoiseField(side, mean, stdev, gaussian) {
    return new Promise(resolve => {
        var noise = document.createElement("canvas");
        noise.setAttribute("id", "noise");
        noise.width = side;
        noise.height = side;
        var ctx = noise.getContext("2d");
        ctx.createImageData(side, side);
        idata = ctx.getImageData(0, 0, side, side);
        for (var x = 0; x < side; x++) {
            for (var y = 0; y < side; y++) {
                amp = (Math.random() - 0.5) * stdev;
                idata.data[(y * side + x) * 4] = mean + amp;     // red
                idata.data[(y * side + x) * 4 + 1] = mean + amp; // green
                idata.data[(y * side + x) * 4 + 2] = mean + amp; // blue
                idata.data[(y * side + x) * 4 + 3] = 255;
            }
        }

        if (gaussian > 0) {
            kernel = makeGaussKernel(gaussian);
            for (var ch = 0; ch < 3; ch++) {
                gauss_internal(idata, kernel, ch, false);
            }
        }
        ctx.putImageData(idata, 0, 0);

        resolve(noise);
    });
}

function makeGaussKernel(sigma) {
    const GAUSSKERN = 6.0;
    var dim = parseInt(Math.max(3.0, GAUSSKERN * sigma));
    var sqrtSigmaPi2 = Math.sqrt(Math.PI * 2.0) * sigma;
    var s2 = 2.0 * sigma * sigma;
    var sum = 0.0;

    var kernel = new Float32Array(dim - !(dim & 1)); // Make it odd number
    for (var j = 0, i = -parseInt(kernel.length / 2); j < kernel.length; i++, j++) {
        kernel[j] = Math.exp(-(i * i) / (s2)) / sqrtSigmaPi2;
        sum += kernel[j];
    }
    // Normalize the gaussian kernel to prevent image darkening/brightening
    for (var i = 0; i < dim; i++) {
        kernel[i] /= sum;
    }
    return kernel;
}

/**
* Internal helper method
* @param pixels - the Canvas pixels
* @param kernel - the Gaussian blur kernel
* @param ch - the color channel to apply the blur on
* @param gray - flag to show RGB or Grayscale image
*/
function gauss_internal(pixels, kernel, ch, gray) {
    var data = pixels.data;
    var w = pixels.width;
    var h = pixels.height;
    var buff = new Uint8Array(w * h);
    var mk = Math.floor(kernel.length / 2);
    var kl = kernel.length;

    // First step process columns
    for (var j = 0, hw = 0; j < h; j++, hw += w) {
        for (var i = 0; i < w; i++) {
            var sum = 0;
            for (var k = 0; k < kl; k++) {
                var col = i + (k - mk);
                col = (col < 0) ? 0 : ((col >= w) ? w - 1 : col);
                sum += data[(hw + col) * 4 + ch] * kernel[k];
            }
            buff[hw + i] = sum;
        }
    }

    // Second step process rows
    for (var j = 0, offset = 0; j < h; j++, offset += w) {
        for (var i = 0; i < w; i++) {
            var sum = 0;
            for (k = 0; k < kl; k++) {
                var row = j + (k - mk);
                row = (row < 0) ? 0 : ((row >= h) ? h - 1 : row);
                sum += buff[(row * w + i)] * kernel[k];
            }
            var off = (j * w + i) * 4;
            (!gray) ? data[off + ch] = sum :
                data[off] = data[off + 1] = data[off + 2] = sum;
        }
    }
}

function trial_num(){
    if ($("#fixed-position").prop("checked")) {
        num_trials = Math.floor((max_freq-frequency+step_freq)/step_freq) * loc.length;
    }else if(!$("#fixed-position").prop("checked") && !$("#random-location").prop("checked")){
        num_trials = Math.floor((max_freq-frequency+step_freq)/step_freq);
    }

}

function createGabor(side, freq, orientation, stdev, phase, contrast) {
    /*
        Generates and returns a Gabor patch canvas.
        Arguments:
        side    		--	The size of the patch in pixels.
        frequency		--	The spatial frequency of the patch.
        orientation		--	The orientation of the patch in degrees.
        std 		--	The standard deviation of the Gaussian envelope.
        phase		--	The phase of the patch.
    */
    var gabor = document.createElement("canvas");
    gabor.setAttribute("id", "gabor");
    gabor.width = side;
    gabor.height = side;
    orientation = orientation * (Math.PI / 180);
    var ctx = gabor.getContext("2d");
    ctx.createImageData(side, side);
    idata = ctx.getImageData(0, 0, side, side);
    var amp, f, dx, dy;
    var c = 0
    for (var x = 0; x < side; x++) {
        for (var y = 0; y < side; y++) {
            // The dx from the center
            dx = x - 0.5 * side;
            // The dy from the center
            dy = y - 0.5 * side;
            t = 0.001 + Math.atan2(dy, dx) + orientation;
            r = Math.sqrt(dx * dx + dy * dy);
            xx = (r * Math.cos(t));
            yy = (r * Math.sin(t));

            amp = 0.5 + 0.5 * Math.cos(2 * Math.PI * (xx * freq + phase));
            f = Math.exp(-0.5 * Math.pow((xx) /(stdev), 2) - 0.5 * Math.pow((yy) / (stdev), 2));

            c+=1;
            idata.data[(y * side + x) * 4] = 255 * (amp);     // red
            idata.data[(y * side + x) * 4 + 1] = 255 * (amp); // green
            idata.data[(y * side + x) * 4 + 2] = 255 * (amp); // blue
            idata.data[(y * side + x) * 4 + 3] = 255 * f * contrast;
        }
    }
    ctx.putImageData(idata, 0, 0);
    return gabor;
}

function contrastImage(imageData, contrast) {

    var data = imageData.data;
    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (var i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    return imageData;
}

async function newTrial(response) {
    stimulusOff = Date.now();
    acceptingResponses = false;

    if(location_adjusted==false){
        updateLocation();
    }
   
    $("#opaque-vr").attr("visible", "true");

    // prints current trial based on experiment type
    if ($("#fixed-position").prop("checked")){
        document.getElementById("bottom-text").setAttribute("text", "value", "\n\n" + (responses.length) + "/" + num_trials);
    }else{
        document.getElementById("bottom-text").setAttribute("text", "value", "\n\n" + (responses.length+1) + "/" + num_trials);
    }

    document.getElementById("bottom-text").setAttribute("position", "0 0 -49");
    document.getElementById("gabor-vr").setAttribute("material", "opacity", "0");
    Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "0") });
    document.getElementById("sky").setAttribute("color", "rgb(0,0,0)");
    document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    
    //records current gabor information to the json outfile 
    if (responses.length <= num_trials) {
        responses.push({
            contrast: contrast,
            frequency: Math.round(frequency*26*100)/100,
            max_freq: max_freq*26,
            size_std: std/10,
            position: position,
            trialTime: stimulusOff - stimulusOn,
      });
    }
    
    await showNoise();
    setTimeout(async function () {
        if (frequency >= max_freq + step_freq) {
            
            // END EXPERIMENT!
            document.getElementById("bottom-text").setAttribute("text", "value", "EXPERIMENT FINISHED!\n\nThanks for playing :)");
            json = {};
            $("#info").find(".input").each(function () {
                if ($(this).attr("type") == "checkbox")
                    json[$(this).attr("id")] = $(this).prop("checked");
                else
                    json[$(this).attr("id")] = isNaN($(this).val()) ? $(this).val() : parseFloat($(this).val())
            });
            json["responses"] = responses;

            downloadObjectAsJson(json, json["participant-id"] + "-" + Date.now());
        } else {
            // NEW TRIAL INFO
            if ($("#fixed-position").prop("checked")){
                angle = angle_pos[counter];
            }
            contrast = 1;
            Imax = 132;
            Imin = 122;

            gabor = createGabor(100, frequency, angle, std, 0.5, contrast);
            rr = gabor.toDataURL("image/png").split(';base64,')[1];
            document.getElementById("bottom-text").setAttribute("text", "value", " Press A to confirm, Press B to reset contrast, Press up/down to adjust contrast");
            document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
            document.getElementById("bottom-text").setAttribute("position", "0 -50 -150");

            acceptingResponses = true;
            if ($("#fixed-position").prop("checked")) {
                position = [loc[counter][0], loc[counter][1],-150];
                counter +=1;

                //if all nine locations are complete then restart counter
                if (counter == loc.length){
                  counter = 0;
                }
                document.getElementById("gabor-vr").setAttribute("position", position.join(" "));
                
                //target follows the 9 fixed positions
                cuePosition=[[position[0], position[1]-7, position[2]], [position[0], position[1]+7, position[2]], [position[0]-7, position[1], position[2]], [position[0]+7, position[1], position[2]]];
                var index = 0;
                Array.from(document.getElementsByClassName("cue")).forEach(function (e) { 
                                        e.setAttribute("material", "opacity", "1");
                                        e.setAttribute("position", cuePosition[index].join(" "));
                                        index+=1;
                                        });

            }   
            if ($("#random-location").prop("checked")) {
                position = [
                    Math.random() * positionVariation - positionVariation / 2, 
                    Math.random() * positionVariation - positionVariation / 2, 
                    -150];
                document.getElementById("gabor-vr").setAttribute("position", position.join(" "));
                
                /*if building the proportion correct study uncomment this
                Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "0") });
                */
                
                var index = 0;
                cuePosition=[[position[0], position[1]-7, position[2]], [position[0], position[1]+7, position[2]], [position[0]-7, position[1], position[2]], [position[0]+7, position[1], position[2]]];

                Array.from(document.getElementsByClassName("cue")).forEach(function (e) { 
                    e.setAttribute("material", "opacity", "1");
                    e.setAttribute("position", cuePosition[index].join(" "));
                    index+=1;
                });
            }
            else {
                Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "1") });
            }
            if ($("#background-noise").prop("checked"))
                document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
            else
                document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
            document.getElementById("gabor-vr").setAttribute("material", "opacity", "1");
            $("#opaque-vr").attr("visible", "false");
            document.getElementById("sky").setAttribute("color", backgroundColor);
            stimulusOn = Date.now();
        }

    }, 1000);

    //if user has seen all 9 trials then we increase frequency by step 
    if(responses.length >= 10 && ((responses.length - 10)%9==0)){
        frequency += step_freq;
    }

    // if experiment is random location or static location, we update frequency with every trial
    if (responses.length >= 1 && !$("#fixed-position").prop("checked") && !$("#random-position").prop("checked")){
        frequency += step_freq;
    }

}

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}