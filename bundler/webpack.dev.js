// Файл конфигурации сборщика Webpack для режима разработки и отладки (dev)
// Здесь, в частности, находятся настройки отладочного веб-сервера.
// Здесь все работает как надо, поэтому вряд ли понадобится что-то менять.

// Инструмент для слияния конфигураций (JS-объектов) - merge:
const { merge } = require('webpack-merge')

// Общая конфигурация из файла './webpack.common.js'
const commonConfiguration = require('./webpack.common.js')

// Внутренний IP-адрес машины внутри той сети, где она находится
const ip = require('internal-ip')

// Инструмент поиска свободного порта
const portFinderSync = require('portfinder-sync')

// Вывод сообщения с обрамлением, форматированием и цветом:
const infoColor = (_message) =>
{
    return `\u001b[1m\u001b[34m${_message}\u001b[39m\u001b[22m`
}

// Сливаем с общей для всех конфигурацией конфигурацию веб-сервера:
module.exports = merge( // Слияние
    commonConfiguration, // Конфигурация из './webpack.common.js'
    { // Конфигурация, специфичная для режима разработки и отладки (dev)
        mode: 'development', // Режим разработки
        devServer: // Веб-сервер разработки и отладки
        {
            host: '0.0.0.0', // IP-адрес - дефолтное значение при запуске заменится на реальное
            port: portFinderSync.getPort(8080), // Порт
            contentBase: './dist', // Папка с контентом
            watchContentBase: true, // Отслеживать изменения папки с контентом
            open: true, // Открыть соединение
            https: false, // Использовать HTTPS
            useLocalIp: true, // Использовать локальный IP-адрес
            disableHostCheck: true, // Отключить проверку хоста
            overlay: true, // Включить оверлей
            noInfo: true, // Сервер не предоставляет дополнительной информации
            after: function(app, server, compiler) // После запуска сервера:
            {
                const port = server.options.port // Порт
                const https = server.options.https ? 's' : '' //'s', если включен HTTPS
                const localIp = ip.v4.sync() // Локальный IP-адрес внутри сети 
                const domain1 = `http${https}://${localIp}:${port}` //Адрес домена #1 по которому доступен проект - по IP-адресу
                const domain2 = `http${https}://localhost:${port}` //Адрес домена #2 по которому доступен проект - по имени
                
                // Вывести сообщение "Проект запущен там-то и там-то":
                console.log(`Project running at:\n  - ${infoColor(domain1)}\n  - ${infoColor(domain2)}`)
            }
        }
    }
)
