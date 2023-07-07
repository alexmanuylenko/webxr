// Файл конфигурации сборщика Webpack для релизной версии (production)
// Здесь все работает как надо, поэтому вряд ли понадобится что-то менять.

// Инструмент для слияния конфигураций (JS-объектов) - merge:
const { merge } = require('webpack-merge')

// Общая конфигурация из файла './webpack.common.js':
const commonConfiguration = require('./webpack.common.js')

// Плагин очистки проекта от отладочной информации ("дебажного мусора"):
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

// Сливаем с общей для всех конфигурацией:
module.exports = merge( // Слияние
    commonConfiguration, // Конфигурация из './webpack.common.js'
    
    // Production-конфигурация:
    {
        mode: 'production', // Релизный режим (production)
        
        // Подключаем плагин:
        plugins:
        [
            // Очистка проекта от отладочной информации ("дебажного мусора"):
            new CleanWebpackPlugin()
        ]
    }
)
