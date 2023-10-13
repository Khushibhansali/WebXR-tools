![image](https://github.com/Khushibhansali/WebXR-tools/assets/30347957/0cd30f3d-c37f-4eaa-addc-58280abb60e6)# WebXR-tools

This page contains a few tools and concepts for the use of WebVR in regulatory science.

The two notable tools are the [Contrast Sensitivity Tool]: (https://khushibhansali.github.io/WebXR-tools/exp-detection-contrast-sensitivity/) and the [Detection Tool](https://khushibhansali.github.io/WebXR-tools/exp-detection-yes-no/)


The purpose of these experiments is to observe the perceptual performance of participant when factors like gabor size, standard deviation, frequency, and position are changed. There are 2 types of experiments to try.
1. [exp-detection-contrast-sensitivity]: (https://khushibhansali.github.io/WebXR-tools/exp-detection-contrast-sensitivity/)
  - This experiment allows the participant to increase/decrease the contrast of the gabor in order to find the threshold contrast. 
  - Participant can also press a special key to indicate that they couldn't see the gabor at full contrast in a certain size, standard deviation, frequency, and position.  
  - At the end, all the trial data is saved into json file.

## Contrast Sensitivity Tool

![plot](Images/exp.PNG)

2. [exp-detection-yes-no]: (https://khushibhansali.github.io/WebXR-tools/exp-detection-yes-no/)
  - This is a portion correct study where gabor is present 50% of the times.  
  - Participant has to predict when gabor is present and when it is absent with factors like size, standard deviation, frequency, and position being modified. 
  - At the end, a percentange correct score will be calculated and all the data from the trials is saved into a json file.

## Detection Tool

![plot](Images/exp2.PNG)

To download the repositiory follow these steps:
1. Click on the green code button between add file button and about section. 
2. Download the repositiory as a zip file or use the command line, navigate to destination folder (cd command), and type git clone https://github.com/Khushibhansali/WebXR-tools.git
3. Open the index.html to modify the contents of the webpage. 
4. Open scripts.js to change any logic from the experiments. 
