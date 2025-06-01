let video;
let facemesh;
let predictions = [];
let handpose;
let handPredictions = [];
let optionButtons = [];
let optionLabels = ['分析', '設計', '發展', '實施', '評估'];
let selectedOption = 0;
let draggingBtn = null;
let offsetX = 0;
let offsetY = 0;
let btnPositions = [];
let answerSequence = ['分析', '設計', '發展', '實施', '評估'];
let currentStep = 0;
let feedbackMsg = '';
let feedbackTimer = 0;
let answerBox = []; // 作答格

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function setup() {
  createCanvas(640, 480).position(
    (windowWidth - 640) / 2,
    (windowHeight - 480) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  facemesh = ml5.facemesh(video, modelReady);
  facemesh.on('predict', results => {
    predictions = results;
  });

  handpose = ml5.handpose(video, handModelReady);
  handpose.on('predict', results => {
    handPredictions = results;
  });

  // 打亂選項順序
  shuffleArray(optionLabels);

  // 建立五個選項按鈕，分佈不重疊
  let placed = [];
  for (let i = 0; i < optionLabels.length; i++) {
    let tries = 0;
    let x, y, overlap;
    do {
      overlap = false;
      x = (windowWidth - 640) / 2 + random(10, 640 - 130);
      y = (windowHeight - 480) / 2 + random(10, 480 - 60);
      for (let j = 0; j < placed.length; j++) {
        let dx = x - placed[j].x;
        let dy = y - placed[j].y;
        if (abs(dx) < 130 && abs(dy) < 45) { // 120+10寬, 35+10高
          overlap = true;
          break;
        }
      }
      tries++;
    } while (overlap && tries < 100);
    placed.push({x, y});
    let btn = createButton(optionLabels[i]);
    btn.position(x, y);
    btn.size(120, 35);
    btn.style('font-size', '18px');
    btn.elt.draggable = false;
    optionButtons.push(btn);
    btnPositions.push({x, y});
  }
}

function checkAnswer(selectedLabel) {
  // 避免重複作答
  if (answerBox.includes(selectedLabel)) {
    feedbackMsg = '此答案已選過，請選擇其他選項';
    feedbackTimer = millis();
    return;
  }
  if (selectedLabel === answerSequence[currentStep]) {
    answerBox[currentStep] = selectedLabel; // 填入作答格
    currentStep++;
    if (currentStep === answerSequence.length) {
      feedbackMsg = '答對了';
      feedbackTimer = millis();
      currentStep = 0;
      shuffleArray(optionLabels); // 答對後重新洗牌
      // 重新設定按鈕文字
      for (let i = 0; i < optionButtons.length; i++) {
        optionButtons[i].html(optionLabels[i]);
      }
      answerBox = []; // 清空作答格
    } else {
      feedbackMsg = '';
    }
  } else {
    feedbackMsg = '答錯了，請重新開始';
    feedbackTimer = millis();
    currentStep = 0;
    answerBox = []; // 答錯也清空作答格
  }
}

function mousePressed() {
  let found = false;
  for (let i = 0; i < optionButtons.length; i++) {
    let bx = btnPositions[i].x;
    let by = btnPositions[i].y;
    let mx = mouseX + (windowWidth - 640) / 2;
    let my = mouseY + (windowHeight - 480) / 2;
    if (
      mx > bx && mx < bx + 120 &&
      my > by && my < by + 35
    ) {
      selectedOption = i; // 觸碰選取
      draggingBtn = i;    // 也可拖曳
      offsetX = mx - bx;
      offsetY = my - by;
      found = true;
      checkAnswer(optionLabels[i]);
      break;
    }
  }
  if (!found) {
    draggingBtn = null;
  }
}

function mouseDragged() {
  if (draggingBtn !== null) {
    let mx = mouseX + (windowWidth - 640) / 2;
    let my = mouseY + (windowHeight - 480) / 2;
    btnPositions[draggingBtn].x = constrain(mx - offsetX, (windowWidth - 640) / 2, (windowWidth - 640) / 2 + 640 - 120);
    btnPositions[draggingBtn].y = constrain(my - offsetY, (windowHeight - 480) / 2, (windowHeight - 480) / 2 + 480 - 35);
    optionButtons[draggingBtn].position(btnPositions[draggingBtn].x, btnPositions[draggingBtn].y);
  }
}

function mouseReleased() {
  draggingBtn = null;
}

function modelReady() {
  // 模型載入完成，可選擇顯示訊息
}

function handModelReady() {
  // 手部模型載入完成，可選擇顯示訊息
}

function draw() {
  image(video, 0, 0, width, height);

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh;

    // 只在第94點畫紅色圓
    const [x, y] = keypoints[94];
    noFill();
    stroke(255, 0, 0);
    strokeWeight(4);
    ellipse(x, y, 100, 100);
  }

  // 畫出手部關鍵點
  if (handPredictions.length > 0) {
    for (let i = 0; i < handPredictions.length; i++) {
      const landmarks = handPredictions[i].landmarks;
      for (let j = 0; j < landmarks.length; j++) {
        const [x, y, z] = landmarks[j];
        fill(0, 255, 0);
        noStroke();
        ellipse(x, y, 10, 10);
      }
      // 手部感應選取選項（僅用第一隻手）
      if (draggingBtn === null && landmarks.length > 8) {
        const [fx, fy] = landmarks[8]; // 食指指尖
        for (let k = 0; k < btnPositions.length; k++) {
          let bx = btnPositions[k].x - (windowWidth - 640) / 2;
          let by = btnPositions[k].y - (windowHeight - 480) / 2;
          if (
            fx > bx && fx < bx + 120 &&
            fy > by && fy < by + 35
          ) {
            if (selectedOption !== k) {
              selectedOption = k;
              checkAnswer(optionLabels[k]);
            }
            optionButtons[k].style('background', '#ff0');
          } else {
            optionButtons[k].style('background', '');
          }
        }
      }
    }
  } else {
    // 沒有手部時移除高亮
    for (let k = 0; k < optionButtons.length; k++) {
      optionButtons[k].style('background', '');
    }
  }

  // 顯示答案選取狀況
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - 120, width, 40);
  textSize(20);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < answerSequence.length; i++) {
    if (i < currentStep) {
      fill(0, 200, 0); // 已選正確步驟為綠色
    } else if (i === currentStep) {
      fill(255, 200, 0); // 目前要選的步驟為黃色
    } else {
      fill(180); // 尚未選的步驟為灰色
    }
    text(answerSequence[i], width / 2 - 200 + i * 100, height - 100);
  }

  // 顯示作答格
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - 80, width, 40);
  textSize(20);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < answerSequence.length; i++) {
    if (answerBox[i]) {
      fill(0, 200, 255); // 已填答案為藍色
      text(answerBox[i], width / 2 - 200 + i * 100, height - 60);
    } else {
      fill(100);
      text('___', width / 2 - 200 + i * 100, height - 60);
    }
  }

  // 顯示目前選擇的選項
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - 40, width, 40);
  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  text('目前選擇: ' + optionLabels[selectedOption], width / 2, height - 20);

  // 顯示提示訊息
  if (feedbackMsg) {
    fill(feedbackMsg === '答對了' ? 'green' : 'red');
    textSize(32);
    textAlign(CENTER, CENTER);
    text(feedbackMsg, width / 2, height / 2);
    // 2秒後自動清除提示
    if (millis() - feedbackTimer > 2000) {
      feedbackMsg = '';
    }
  }
}

function getSelectedAnswer() {
  return optionLabels[selectedOption];
}
