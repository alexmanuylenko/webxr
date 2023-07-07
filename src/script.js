// Главный скрипт приложения.
// Вся работа с AR и 3D-графикой здесь.

// Notes: Размеры указаны в метрах, углы - в радианах и градусах, в зависимости от контекста.
// Система координат по умолчанию - "левая": ось X - слева направо, ось Y - сверху вниз, ось Z - вглубь экрана.

// Подключаем движок THREE.JS
import * as THREE from 'three'

// Подключаем кнопку дополненной реальности ARButton из THREE.JS
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

// Подключаем загрузчик 3D-моделей в формате GLTF/GLB из THREE.JS
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Подключаем стили нашей страницы.
// Поскольку используем Webpack, то делаем это здесь.
// Хотя я не уверен, что этому здесь самое место.
// Not sure if we really need this:
import './style.css'

// Настройки приложения, сцены, трехмерной модели, центрирования, вида, поведения, в том числе и модели.
// TODO: Эти настройки должны быть/будут для каждой модели свои, разные, при этом хранить их нужно
// в отдельных конфигурационных файлах для каждой страницы и модели в формате JSON или JavaScript-объекта Config,
// например: fire.config.json/fire.config.js, leela.config.json/leela.config.js, bender.config.json/bender.config.js и так далее.
// Поскольку сейчас у нас Single Page Application надо продумать систему динамической подгрузки этих конфигов,
// либо переделать все на Multiple Pages Application, где тоже своя специфика (возможно придется отказаться от Webpack?)
// TODO: Move to settings config file, unique for each page/model or JSON:
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// URL файла откуда загружать модель
const MESH_MODEL_FILE_NAME_URL = "https://alexmanuylenko.github.io/webxr-assets/fire_scene.glb"
// const MESH_MODEL_FILE_NAME_URL = "https://alexmanuylenko.github.io/webxr-assets/leela.glb"
// const MESH_MODEL_FILE_NAME_URL = "https://alexmanuylenko.github.io/webxr-assets/bender.glb"

// URL файла с изображением маркера, который надо будет отслеживать и который будет изображен на полупрозрачной "рамке цели",
// когда изображение маркера еще не найдено в окружающей среде
const TEXTURE_MARKER_IMAGE_FILE_NAME_URL = 'https://raw.githubusercontent.com/alexmanuylenko/webxr-assets/master/fire_marker.jpg'
// const TEXTURE_MARKER_IMAGE_FILE_NAME_URL = 'https://raw.githubusercontent.com/alexmanuylenko/webxr-assets/master/leela.png'
// const TEXTURE_MARKER_IMAGE_FILE_NAME_URL = 'https://raw.githubusercontent.com/alexmanuylenko/webxr-assets/master/bender.png'

// Notes: Из-за всяческих CORS-особенностей файлы модели и маркера должны, в идеале, быть расположены на другом сервере, домене и так далее.
// С чтением моделей и изображений локально возникли проблемы, они же возникли, если файлы-ассеты расположены на том же сервере и домене.

// Цвет неба сцены
const SKY_COLOR = 0xffffff 

// Цвет земли в сцене
const GROUND_COLOR = 0xbbbbff

// Интенсивность источника света в сцене
const LIGHT_INTENSITY = 1

// Позиция источника света в сцене
const LIGHT_POSITION = new THREE.Vector3(0.5, 1, 0.25)

// Параметр центрирования модели: расстояние, на которое переместить модель вдоль вертикальной оси при обработке
const HEIGHT_DISTANCE = 1.0

// Во сколько раз удалить модель от камеры на расстояние равное диагонали модели
// Диагональ модели - расстояние от минимальной до максимальной точки
// ограничивающего параллелепипеда (AABB - Axis-Aligned Bounding Box) модели.
const DIAGONAL_FRONT_DISTANCE = 1.5

// Расстояние полупрозрачной "рамки цели" от точки зрения
const TARGET_MESH_DISTANCE = 3.0

// Положение проекционных дисплеев (HUD - Heads-Up Display, см. далее) 
// в пространстве относительно камеры 
// по-умолчанию (если не задан следующий параметр HUD_POSITION)
const DEFAULT_HUD_POSITION = new THREE.Vector3(0.0, 1.5, -5.0)

// Текущее положение проекционных дисплеев (HUD - Heads-Up Display, см. далее) 
// в пространстве относительно камеры.
// Может совпадать, а может и не совпадать с DEFAULT_HUD_POSITION 
const HUD_POSITION = new THREE.Vector3(0.0, 1.5, -5.0)

// Параметры обработки (трансформации, преобразования, центрирования) модели после загрузки
// Mesh model processing (centring) parameters:
//////////////////////////////////////////////////////////////////////////////////////////
// Масштабировать нормированную (приведенную к единичному параллелепипеду) модель с этими коэффициентами
const MESH_MODEL_SCALE = new THREE.Vector3(0.5, 0.5, 0.5)

// Повернуть модель вокруг соответствующих осей на эти углы
const MESH_MODEL_ROTATE = new THREE.Vector3(0.0, 0.0, 0.0)

// Перенести модель вдоль соответствующих осей на эти расстояния (в метрах)
const MESH_MODEL_TRANSLATE = new THREE.Vector3(0.0, -0.2, 0.0)
//////////////////////////////////////////////////////////////////////////////////////////

// Анимируется ли модель?
const ANIMATED = true

// В разработке:
// Вращать ли модель вокруг вертикальной оси (для презентации)?
// TODO
const ROTATED = false

// В разработке:
// Если модель вращаем вокруг вертикальной оси, то
// на какой угол повернуть модель за 1 интервал между вызовами
// функции обновления?
//TODO
const ROTATION_DELTA = Math.PI / 12.0

// Задел на будущее:
// По умолчанию, когда маркер найден мы помещаем модель в центр изображения и ориентируем по плоскости изрбражения.
// Если выставлен данный флаг, то это означает иное поведение:
// мы копируем данные RigidTransform, то есть position и orientation маркера в модель,
// но при этом не трогаем масщтаб модели.
// В нашем пользовательском случае мы сканируем маркер (граффити) со стены.
// Данный режим может быть полезен при сканировании маркера, нарисованного на земле,
// при этом модель будет выглядеть как бы "стоящая" на маркере.
// If this is set to true copy position and orientation, but NOT scale to mesh from image transformation
// TODO
const RIGID_TRANSFORMED = false

// Задел на будущее:
// Если данный флаг выставлен, то мы полностью копируем матрицу преобразования matrix изображения маркера в модель.
// При этом меняются не только позиция position, ориентация orientation, но, возможно и масштаб scale модели.
// If this is set to true simply copy transform matrix ( + position + orientation AND scale) from image transformation to mesh
// TODO
const FULLY_TRANSFORMED = false

// Флаг отладочного режима.
// Если активен, то много чего пишется в консоль.
// В релизе должен быть false.
const DEBUG = false
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Рабочие переменные
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Камера наблюдателя 3D-сцены
let camera

// Канва, "холст", на который выводится графика
let canvas

// Трехмерная сцена
let scene

// Рендерер, WebGLRenderer
let renderer

// Собственно выводимая модель.
// mesh - плохое имя, модель может состоять из нескольких мешей
let mesh

// Меш полупрозрачной "рамки цели" с изображением маркера
let targetMesh

// Левая, нижняя, ближняя точка ограничивающего параллелепипеда (AABB - Axis-Aligned Bounding Box) модели
let min = new THREE.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)

// Правая, верхняя, дальняя точка ограничивающего параллелепипеда (AABB - Axis-Aligned Bounding Box) модели
let max = new THREE.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE)

// Ширина модели (размер AABB по оси X)
let width

// Высота модели (размер AABB по оси Y)
let height

// Глубина модели (размер AABB по оси Z)
let length

// Коэффициент масштабирования для приведения к модели,
// максимальная из сторон AABB которой имеет длину 1.
let scaleFactor

// Геометрический центр модели
let center

// Диагональ модели, а точнее ее AABB - вектор от точки min до точки max 
let diag

// Длина диагонали модели
let diagLength

// Вектор от геометрического центра модели до позиции наблюдателя камеры
let toCameraPosVector

// Вектор направления "взгляда" камеры
let lookAtVector

// Микшер анимации - THREE.AnimationMixer
let mixer

// Готова ли модель к проигрыванию анимации?
let modelReady = false

// Проигрывается ли анимация?
let played = false

// Текущее активное анимационное действие - THREE.AnimationAction
let activeAction

// Видна ли полупрозрачная "рамка цели" с изображением маркера?
let targetMeshVisible = true

// Служебные часы, для анимации и HUD
const clock = new THREE.Clock()
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HUD - Heads-Up Display - 2D проекционный дисплей для отображения различной информации.
// Сейчас отображает индикаторы производительности - FPS и время рендеринга одного кадра,
// в играх может отображать уровень здоровья персонажа или боеприпасов.
// TODO: Задел на будущее: Нарисовать полупрозрачную рамку цели не в трехмерном пространстве,
// а на 2D-контексте данного HUD.
// Функционал подсчета FPS и времени кадра на данный момент из релизной версии может быть исключен.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Канва, "холст", на который выводится графика HUD
let hudCanvas

// Графический 2D-контекст для HUD
let hudCtx

// Изображение текстуры, в которую выводится HUD
let hudTexture

// Плоскость в пространстве камеры, на которую выводится HUD
let hudPlane

// Кастомная величина 1, которая может выводиться в HUD
let hudCustom1

// Кастомная величина 2, которая может выводиться в HUD
let hudCustom2

// Кастомная величина 3, которая может выводиться в HUD
let hudCustom3

// Переменная-таймер для HUD для измерения прошедшего времени
// Содержит Дату/Время либо объект Performance (Node.js)
let hudTimer = performance || Date

// Измеряем ли время рендеринга кадра в милисекундах?
let hudMsActive = false

// Начало измерения времени кадра
let hudMsStart = hudTimer.now()

// Конец измерения времени кадра
let hudMsEnd = hudTimer.now()

// Данные для графика времени кадра
let hudMsGraphData = new Array(32).fill(0)

// Количество прошедших милисекунд
let hudMs = 0

// Задержка обновления дисплея HUD
let hudDisplayRefreshDelay = 100

// Последнее время когда было измерено FPS
let hudFpsLastTime = hudTimer.now()

// Количество отрендеренных кадров
let hudFpsFrames = 0

// Данные для графика FPS
let hudFpsGraphData = new Array(32).fill(0)

// (Не используется) Камера наблюдателя HUD. Сейчас совпадает с камерой основной сцены.
let hudCamera

// (Не используется) Сцена для HUD. Предполагалось держать для HUD отдельную сцену, но сейчас HUD рисуется по сути в основной сцене.
let hudScene

// Создание HUD
// Передаем сцену и камеру, но на данный момент это не используется.
function createHud(_scene, _camera) {
  // Запоминаем сцену и камеру, хотя это не используется
  hudScene = _scene
  hudCamera = _camera;
  
  // Если камера не привязана к сцене - привязываем
  if (hudCamera.parent === null) {
    hudScene.add(hudCamera);
  }

  
  // Создаем на страницк отдельный элемент <canvas>
  // в который будем выводить HUD-графику
  // TODO: Попробовать обойтись существующей канвой:
  // hudCanvas = document.querySelector('canvas.webgl')
  hudCanvas = document.createElement("canvas")
  hudCanvas.width = 64
  hudCanvas.height = 64

  // Получаем 2D-контекст новой канвы
  hudCtx = hudCanvas.getContext("2d")

  // Получаем текстуру, куда будем отрисовывать HUD, из 2D-контекста
  hudTexture = new THREE.Texture(hudCanvas)
  
  // Создаем материал на основе текстуры из 2D-контекста
  const hudMaterial = new THREE.MeshBasicMaterial({
    map: hudTexture,
    depthTest: false,
    transparent: true,
  })
  
  // Конструируем плоскость, на которой будем выводить HUD,
  // натягиваем на нее текстуру из 2D-контекста,
  // задаем положение в пространстве.
  const hudGeometry = new THREE.PlaneGeometry(1, 1, 1, 1)
  hudPlane = new THREE.Mesh(hudGeometry, hudMaterial)
  hudPlane.position.x = DEFAULT_HUD_POSITION.x
  hudPlane.position.y = DEFAULT_HUD_POSITION.y
  hudPlane.position.z = DEFAULT_HUD_POSITION.z
  hudPlane.renderOrder = 9999

  // Добавляем нашу плоскость с текстурой в пространство камеры
  hudCamera.add(hudPlane) // Это - не нужно, по крайней мере сейчас
  camera.add(hudPlane) // А это - правильно, по крайней мере сейчас
}

// Вкл/Выкл HUD
function setHudEnabled(enabled) {
  hudPlane.visible = enabled
}

// Установить положение (плоскости) HUD по X
function setHudX(val) {
  hudPlane.position.x = val
}

// Установить положение (плоскости) HUD по Y
function setHudY(val) {
  hudPlane.position.y = val
}

// Установить положение (плоскости) HUD по Z
function setHudZ(val) {
  hudPlane.position.z = val
}

// Установить кастомную наблюдаемую величину 1
function setHudCustom1(val) {
  hudCustom1 = val
}

// Установить кастомную наблюдаемую величину 2
function setHudCustom2(val) {
  hudCustom2 = val
}

// Установить кастомную наблюдаемую величину 3
function setHudCustom3(val) {
  hudCustom3 = val
}

// Начать отсчет милисекунд времени рендеринга одного кадра: запустить таймер HUD
function startHudTimer() {
  hudMsActive = true // Запуск, начало отсчета
  hudMsStart = hudTimer.now() // Начало отсчета = Текущее время/дата
}

// Закончить отсчет милисекунд времени рендеринга одного кадра
function endHudTimer() {
  hudMsEnd = hudTimer.now() //Конец отсчета = Текущее время/дата
  hudMs = ((hudMsEnd - hudMsStart) * 100) / 100 // Сколько прошло милисекунд за время отсчета
}

// Добавить объект к HUD
// Добавляет объект в пространство камеры
function addToHud(object3d) {
  hudCamera.add(object3d) // Это не нужно
  camera.add(object3d) // Это правильно
}

// Обновление HUD
function updateHud() {
  // Текстуру, куда отрисовываем HUD надо обновить
  hudTexture.needsUpdate = true;

  // Берем текущее время/дату
  const now = hudTimer.now();

  // Сколько прошло с тех пор как измеряли FPS в последний раз:
  const dt = now - hudFpsLastTime;
  
  // Увеличиваем счетчик кадров
  hudFpsFrames++;

  // Если прошло времени больше, чем заданная задержка, то:
  if (now > hudFpsLastTime + hudDisplayRefreshDelay) {
    // Очищаем контекст - будем перерисовывать HUD заново
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

    //Считаем FPS в зависимости от того, сколько прошло кадров
    hudFpsLastTime = now;
    var FPS = ((((hudFpsFrames * 1000) / dt) * 100) / 100).toFixed(2);

    // Обнуляем счетчик кадров
    hudFpsFrames = 0;

    // Запоминаем текущее значение FPS в массиве для графика:
    hudFpsGraphData.push(FPS);

    // Если в массиве большк 32 элементов - сдвигаем массив
    if (hudFpsGraphData.length >= 32) {
      hudFpsGraphData.shift();
    }

    // Находим максимальный элемент в массиве
    var ratio = Math.max.apply(null, hudFpsGraphData);

    // Рисуем график FPS
    hudCtx.strokeStyle = "#035363"; // Стиль линии
    for (var i = 0; i < 32; i++) { // Рисуем 32 вертикальных линии
      hudCtx.beginPath(); // Начинаем рисовать линию
      hudCtx.moveTo(i, 16); // Начало линии
      hudCtx.lineTo(i, 16 - (hudFpsGraphData[i] / ratio) * 16); // Конец линии. Высота линии - нормированная, в зависимости от значения в массиве и максимального значения
      hudCtx.stroke(); // Рисуем линию, применяем стиль
    }

    // Выводим числовое значение FPS
    hudCtx.font = "13px Calibri"; // Шрифт цифр
    hudCtx.fillStyle = "#00cc00"; // Стиль заливки
    hudCtx.fillText(FPS, 1, 13); // Выводим текст со значением FPS

    //Выводим значение MS - милисекунд, время рендеринга одного кадра
    if (hudMsActive) { // Если идет отсчет (измерение) времени рендеринга кадра, то:
      // Добавить в массив текущее значение времени
      hudMsGraphData.push(hudMs);

      // Если значений в массиве больше 32 - сдвигаем массив
      if (hudMsGraphData.length >= 32) {
        hudMsGraphData.shift();
      }

      // Находим максимальный элемент в массиве
      ratio = Math.max.apply(null, hudMsGraphData);
      
      // Рисуем график MS милисекунд времени кадра
      hudCtx.strokeStyle = "#f35363";  // Стиль линии
      for (var i = 0; i < 32; i++) { // Рисуем 32 вертикальных линии
        hudCtx.beginPath(); // Начинаем рисовать линию
        hudCtx.moveTo(i + 32, 16); // Начало линии
        hudCtx.lineTo(i + 32, 16 - (hudMsGraphData[i] / ratio) * 16); // Конец линии. Высота линии - нормированная, в зависимости от значения в массиве и максимального значения
        hudCtx.stroke();  // Рисуем линию, применяем стиль
      }

      // Выводим числовое значение MS времени кадра
      hudCtx.font = "13px Calibri";  // Шрифт цифр
      hudCtx.fillStyle = "#00ccff";  // Стиль заливки
      hudCtx.fillText(hudMs.toFixed(2), 33, 13); // Выводим текст со значением текущего времени кадра
    }

    //Вывод Custom-ных метрик, наблюдаемых значений
    if (hudCustom1) { // Если величина определена
      hudCtx.font = "11px"; // Шрифт цифр
      hudCtx.fillStyle = "#ffffff";  // Стиль заливки
      hudCtx.fillText(hudCustom1, 0, 29); // Выводим значение кастомной величины 1
    }
    if (hudCustom2) { // Если величина определена
      hudCtx.font = "11px"; // Шрифт цифр
      hudCtx.fillStyle = "#ffffff"; // Стиль заливки
      hudCtx.fillText(hudCustom2, 0, 45); // Выводим значение кастомной величины 2
    }
    if (hudCustom3) { // Если величина определена
      hudCtx.font = "11px"; // Шрифт цифр
      hudCtx.fillStyle = "#ffffff";
      hudCtx.fillText(hudCustom3, 0, 61); // Выводим значение кастомной величины 3
    }
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Основной код приложения
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Отладочное логирование
function log(message) {
  // Если фоаг DEBUG выставлен записать сообщение в консоль
  if (DEBUG) {
    console.log(message)
  }
}

// Настройка отладочного логирования
// Внимание: В релизной версии эта функция должна быть закомментирована
// for image tracking we need a mobile debug console as it only works on android
// This library is very big so only use it while debugging - just comment it out when your app is done
function setupMobileDebug() {
  // Получить элемент <div> с id="console-ui" страницы для вывода консоли
  const containerEl = document.getElementById("console-ui");
  
  // Инициализировать библиотеку отладочной консоли
  eruda.init({
    container: containerEl // Назначить контейнерный элемент для консоли
  });

  // Инициализировать инструменты разработки и отладки консоли
  // Запрос селектора, который добавим позже, при инициализации из Shadow DOM
  const devToolEl = containerEl.shadowRoot.querySelector('.eruda-dev-tools');
  
  // Высота отладочной консоли = 40% экрана
  // control the height of the dev tool panel
  devToolEl.style.height = '40%';
}

// Обход верщин объекта obj и применение к ним функции callback
// obj может быть составным объектом
// Данная функция не меняет сами вершины, далее она используется, в частности, для
// расчета ограничивающего параллелепипеда (AABB - Axis-Aligned Bounding Box) модели
function traverseObjectVertices(obj, callback) {
  //Массив объектов для обработки
  const front = new Array;
  
  if (Array.isArray(obj)) { // Если объект составной
    // Добавляем каждую часть составного объекта в массив для обработки
    for (let i = 0; i < obj.length; i++) {
      front.push(obj[i]);
    }
  } else { // Если объект не составной
    // Добавляем сам объект в массив для обработки
    front.push(obj);
  }

  // Обходим, просматриваем массив и обрабатываем каждый объект
  while (front.length > 0) {
    
    // Берем ("снимаем с вкрхушки") очередной объект
    // pop have better performance than shif, and we can go from back in this case
    const obj = front.pop();
    
    if (!obj) { // Если объект не определен (null, undefined, etc...)
      // Пропускаем объект
      continue
    }
    
    // Если объект является экземпляром класса THREE.Mesh и при этом у него определено поле геометрии geometry:
    if (obj instanceof THREE.Mesh && obj.geometry !== undefined) {
      // Берем массив вершин геометрии объекта
      const vertices = obj.geometry.vertices;
      
      // Текущая верщина
      const vertex = new THREE.Vector3();

      if (vertices !== undefined) { // Если массив вершин определен
        for (let i = 0; i < vertices.length; ++i) { // Цикл по всему массиву вершин
          // Применяем к КОПИИ текущей вершины массива мировое преобразование объекта
          // и передаем результат в вызываемую callback-функцию для обработки
          callback(vertex.copy(vertices[i]).applyMatrix4(obj.matrixWorld));
        }
      }

      // Если массив вершин неопределен, но при этом определены аттрибуты геометрии объекта и в аттрибутах есть координаты позиций вершин position
      if (vertices === undefined && obj.geometry.attributes !== undefined && "position" in obj.geometry.attributes) {
        // Берем массив аттрибутов координат вершин (позиций) их геометрии объекта  
        const pos = obj.geometry.attributes.position;
        
        // Цикл по массиву аттрибутов с шагом равным размеру одного элемента этого массива, перебираем элементы
        for (let i = 0; i < pos.count * pos.itemSize; i += pos.itemSize) {
          // Достаем координаты вершины из элементов, копируем в текущую вершину
          vertex.set(pos.array[i], pos.array[i + 1], pos.array[i + 2]);
          
          // Применяем к копии вершины мировое преобразование объекта
          // и передаем результат в вызываемую callback-функцию для обработки
          callback(vertex.applyMatrix4(obj.matrixWorld));
        }
      }
    }

    if (obj.children !== undefined) { // Если у объекта есть "дети"
      // Добавляем всех "детей" в массив для обработки
      for (const child of obj.children) {
        front.push(child);
      }
    }
  } // Повторяем, пока массив front объектов для обработки не станет пустым
}

async function setupImageTarget() {
  const img = document.getElementById('img')
  const imgBitmap = await createImageBitmap(img)
  log(imgBitmap)
  return imgBitmap
}

function createTargetMesh(texture) {
  var material = new THREE.MeshBasicMaterial( {
    'map': texture,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  })
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array( [
    -1.0, -1.0,  0.0, // v0
     1.0, -1.0,  0.0, // v1
     1.0,  1.0,  0.0, // v2
    -1.0,  1.0,  0.0, // v3
  ] )
  const indices = [
    0, 1, 2,
    2, 3, 0,
  ]
  const uv = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
  ])
  geometry.setIndex( indices );
  geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  geometry.setAttribute( 'uv', new THREE.BufferAttribute( uv, 2 ) );
  return new THREE.Mesh(geometry, material)
}

function createARButton(imgBitmap) {
  //more on image-tracking feature: https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"], // notice a new required feature
    trackedImages: [
      {
        image: imgBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 0.7 // in meters what the size of the PRINTED image in the real world
      }
    ],
    //this is for the mobile debug
    optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
    domOverlay: {
      root: document.body
    }
  });
  return button
}

async function init() {
  canvas = document.querySelector('canvas.webgl')

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, 
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );
  camera.matrixAutoUpdate = true;
  if (camera.parent === null) {
    scene.add(camera);
  }

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true

  const light = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, LIGHT_INTENSITY)
  light.position.set(LIGHT_POSITION.x, LIGHT_POSITION.y, LIGHT_POSITION.z)
  scene.add(light)

  createHud(scene, camera)
  setHudX(HUD_POSITION.x)
  setHudY(HUD_POSITION.y)
  setHudZ(HUD_POSITION.z)

  const loader = new GLTFLoader()

  loader.load(MESH_MODEL_FILE_NAME_URL, function(gltf) {
    mesh = gltf.scene;
 
    if (ANIMATED) {
      mixer = new THREE.AnimationMixer(mesh)
      activeAction = mixer.clipAction(gltf.animations[0])
      log('Active action: ' + activeAction)  
    }

    traverseObjectVertices(mesh, (vertex) => { 
      min.x = Math.min(min.x, vertex.x)
      min.y = Math.min(min.y, vertex.y)
      min.z = Math.min(min.z, vertex.z)
    
      max.x = Math.max(max.x, vertex.x)
      max.y = Math.max(max.y, vertex.y)
      max.z = Math.max(max.z, vertex.z)
    })

    center = new THREE.Vector3((min.x + max.x) / 2.0, (min.y + max.y) / 2.0, (min.z + max.z) / 2.0)
    diag = new THREE.Vector3(max.x - min.x, max.y - min.y, max.z - min.z)
    diagLength = diag.length()

    width = Math.abs(max.x - min.x)
    height = Math.abs(max.y - min.y)
    length = Math.abs(max.z - min.z)
    scaleFactor = Math.max(width, Math.max(height, length))
    let rScaleFactor = 1.0 / scaleFactor
    
    mesh.scale.set(MESH_MODEL_SCALE.x * rScaleFactor, MESH_MODEL_SCALE.y * rScaleFactor, MESH_MODEL_SCALE.z * rScaleFactor)
    mesh.rotateX(MESH_MODEL_ROTATE.x)
    mesh.rotateY(MESH_MODEL_ROTATE.y)
    mesh.rotateZ(MESH_MODEL_ROTATE.z)
    mesh.translateX(MESH_MODEL_TRANSLATE.x)
    mesh.translateY(MESH_MODEL_TRANSLATE.y)
    mesh.translateZ(MESH_MODEL_TRANSLATE.z)

    //mesh.matrixAutoUpdate = false; // important we have to set this to false because we'll update the position when we track an image
    mesh.visible = false;
    scene.add(mesh);
    modelReady = true

    var textureLoader = new THREE.TextureLoader()
    textureLoader.load(TEXTURE_MARKER_IMAGE_FILE_NAME_URL, async function(texture) {
  
      targetMesh = createTargetMesh(texture)
      targetMesh.visible = false
      scene.add(targetMesh);
    
      var imgBitmap = await setupImageTarget()
      const button = createARButton(imgBitmap)
      document.body.appendChild(button);
    })  
  });

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function play() {
    if (!ANIMATED) {
      return
    }
    if (!activeAction) {
      log('Play: No active action')
      return
    }
    if (DEBUG) {
      log('Play: Active action: ' + activeAction)
    }
    
    activeAction.reset()
    activeAction.fadeIn(1)
    activeAction.play()

    played = true
}

function stop() {
  if (!ANIMATED) {
    return
  }
  if (!activeAction) {
    log('Stop: No active action')
    return
  }
  log('Stop: Active action: ' + activeAction)

  activeAction.fadeOut(1)
  activeAction.stop()
  activeAction.reset()

  played = false
}

async function updateFromCamera() {
  if (!camera || !center) {
    return
  }

  lookAtVector = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(camera.quaternion)
  lookAtVector = lookAtVector.normalize()
  toCameraPosVector = new THREE.Vector3(camera.position.x - center.x, camera.position.y - center.y, camera.position.z - center.z)

  camera.up = new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(camera.quaternion)
  
  log('camera pos: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')')
  log('camera up: (' + camera.up.x + ', ' + camera.up.y + ', ' + camera.up.z + ')')
  log('lookAtVector: (' + lookAtVector.x + ', ' + lookAtVector.y + ', ' + lookAtVector.z + ')')
  log('toCameraPosVector: (' + toCameraPosVector.x + ', ' + toCameraPosVector.y + ', ' + toCameraPosVector.z + ')')
}

async function updateMesh() {
  // TODO
}

async function updateMeshToScreenCenter() {
  let newPosition = new THREE.Vector3(
    camera.position.x - HEIGHT_DISTANCE * height * camera.up.x + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.x,
    camera.position.y - HEIGHT_DISTANCE * height * camera.up.y + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.y,
    camera.position.z - HEIGHT_DISTANCE * height * camera.up.z + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.z,
  )
  mesh.position.set(newPosition.x, newPosition.y, newPosition.z)
  mesh.lookAt(camera.position)
  mesh.up = camera.up
}

async function updateMeshByPose(pose) {
  if (!pose || !mesh) {
    return
  }
  let position = new THREE.Vector3(
    pose.transform.position.x + MESH_MODEL_TRANSLATE.x, 
    pose.transform.position.y + MESH_MODEL_TRANSLATE.y, 
    pose.transform.position.z + MESH_MODEL_TRANSLATE.z)
  mesh.position.set(position.x, position.y, position.z)
  if (!ROTATED) {
    let lookAt = new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(pose.transform.orientation) 
    lookAt = lookAt.normalize()
    let target = new THREE.Vector3(
      position.x + lookAt.x,
      position.y + lookAt.y,
      position.z + lookAt.z
    )  
    mesh.lookAt(target)
  }
  else {
    // TODO: ticks, clocks, milliseconds, sync, etc
    mesh.rotateY(ROTATION_DELTA * clock.getDelta())
  }
  mesh.up = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(pose.transform.orientation) // just for some case
  // mesh.matrix.fromArray(pose.transform.matrix);
}

async function updateTargetMesh() {
  if (!camera || !targetMesh) {
    return
  }

  let newPosition = new THREE.Vector3(
    camera.position.x + TARGET_MESH_DISTANCE * lookAtVector.x,
    camera.position.y + TARGET_MESH_DISTANCE * lookAtVector.y,
    camera.position.z + TARGET_MESH_DISTANCE * lookAtVector.z,
  )

  targetMesh.position.set(newPosition.x, newPosition.y, newPosition.z)
  targetMesh.lookAt(camera.position)
  targetMesh.up = camera.up
}

async function showMesh() {
  if (mesh) {
    mesh.visible = true
  }
}

async function hideMesh() {
  if (mesh) {
    mesh.visible = false
  }
}

async function showTargetMesh() {
  if (targetMesh) {
    targetMesh.visible = true
  }
}

async function hideTargetMesh() {
  if (targetMesh) {
    targetMesh.visible = false
  }
}

async function update() {
  updateFromCamera()
  updateMesh()
  updateTargetMesh()
}

async function renderFrame(timestamp, frame) {
  if (!frame) { 
    return 
  }

  const referenceSpace = renderer.xr.getReferenceSpace();

  showTargetMesh()
  if (!targetMeshVisible) {
    hideTargetMesh()
  }

  targetMeshVisible = true

  //checking if there are any images we track
  const results = frame.getImageTrackingResults()
  
  //if we have more than one image the results are an array 
  for (const result of results) {
    // The result's index is the image's position in the trackedImages array specified at session creation
    const imageIndex = result.index;

    // Get the pose of the image relative to a reference space.
    const pose = frame.getPose(result.imageSpace, referenceSpace);

    //checking the state of the tracking
    const state = result.trackingState;
    log(state);

    if (state == "tracked") {
      log("Image target has been found")
      targetMeshVisible = false
      if (ANIMATED && (!played)) play()
      if (ANIMATED && modelReady) mixer.update(clock.getDelta())
      updateMeshByPose(pose)
      showMesh()
    } else if (state == "emulated") {
      if (ANIMATED && played) stop()
      hideMesh()
      log("Image target no longer seen")
    }
  }
}

async function mainLoop(timestamp, frame) {
  startHudTimer()
  update()
  updateHud()
  renderFrame(timestamp, frame)
  renderer.render(scene, camera)
  endHudTimer()
}

function main() {
  renderer.setAnimationLoop(mainLoop)
}

setupMobileDebug()
init()
main()
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////