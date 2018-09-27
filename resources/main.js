var client;
var subscription;

var connect_callback = function () {
    subscription = client.subscribe(vm.stream, function (message) {
        var msgBody = JSON.parse(message.body);
        console.log(msgBody);
        if (typeof msgBody.status !== 'undefined') {
            vm.connectionStatus.status = msgBody.status;
            vm.connectionStatus.message = msgBody.message;
        } else {
            vm.items = msgBody;
        }
    }, vm.headers);
}

var disconnect_callback = function () {
    vm.connectionStatus.status = 'DISCONNETED';
    vm.connectionStatus.message = 'Disconnected from the server.';
    console.log(vm.connectionStatus.message);
    vm.streaming = false;
}

var error_callback = function (error) {
    console.log('Error from error_callback:');
    console.log('- Message: ' + error.message);
    console.log('- Body: ' + error.body);
    console.log('- Error object: ' + error);
    vm.streaming = false;
}

var vm = new Vue({
    el: '#app',
    data: {
        connectionStatus: {
            status: 'DEFAULT',
            message: 'Default message'
        },
        items: [],
        env: 'production',
        streamType: '',
        api_key: '',
        isApiKeyOK: false,
        source: '',
        isSourceOK: false,
        streaming: false,
        dataView: 'initialView',
        presenceQuery: ''
    },
    watch: {
        api_key: function (newValue) {
            if (newValue.length === 32) {
                this.isApiKeyOK = true;
            } else {
                this.isApiKeyOK = false;
            }
        },
        source: function (newValue) {
            // TODO: Add MAC address as an acceptable source value
            if ((newValue.length >= 4 && newValue.length <= 6) || newValue.length === 17 || newValue.length === 36) {
                this.isSourceOK = true;
            } else {
                this.isSourceOK = false;
            }
        }
    },
    computed: {
        stream: function () {
            switch (this.streamType) {
                case 'presence':
                    this.dataView = this.streamType + 'View';
                    if (this.source.length > 17) {
                        return '/stream/' + this.source + '/' + this.streamType;
                    } else {
                        return '/presence/stream/' + this.source;
                    }
                case 'accelerometer':
                case 'sensor':
                case 'health':
                case 'button':
                    this.dataView = this.streamType + 'View';
                    return '/stream/' + this.source + '/' + this.streamType;
                default:
                    break;
            }
        },
        url: function () {
            switch (this.env) {
                case 'production':
                    return 'wss://ovs.kontakt.io:9090/stream?apiKey=' + this.api_key;
                case 'accept':
                    return 'wss://acceptrtls.kontakt.io:9090/stream?apiKey=' + this.api_key;
                case 'test':
                    return 'wss://testrtls.kontakt.io:9090/stream?apiKey=' + this.api_key;
                default:
                    break;
            }
        },
        headers: function () {
            return {'api-key': this.api_key};
        },
        isDefaultAPIKeyAvailable: function () {
            return localStorage.getItem('default-api-key');
        },
        isDefaultSourceAvailable: function () {
            return localStorage.getItem('default-source');
        },
        startButtonDisabled: function () {
            if (this.isApiKeyOK && this.isSourceOK && this.streamType.length > 0) {
                return false;
            } else {
                return true;
            }
        },
        filteredPresenceItems: function () {
            if (this.streamType === 'presence' && presenceQuery.length > 0) {
                
            } else {
                return this.items
            }
        }
    },
    methods: {
        startStreaming: function () {
            this.items = [];
            client = Stomp.client(this.url);
            client.connect(this.headers, connect_callback, error_callback);
            this.streaming = true;
            //$('html,body').animate({scrollTop: $('#results').offset().top})
        },
        stopStreaming: function () {
            subscription.unsubscribe();
            client.disconnect(disconnect_callback);
            //this.streaming = false
        },
        saveDefault: function (key) {
            switch (key) {
                case 'api-key':
                    localStorage.setItem('default-api-key', this.api_key);
                    break;
                case 'source':
                    localStorage.setItem('default-source', this.source);
                    break;
                default:
                    break;
            }
        },
        loadDefault: function (key) {
            switch (key) {
                case 'api-key':
                    this.api_key = localStorage.getItem('default-api-key');
                    break;
                case 'source':
                    this.source = localStorage.getItem('default-source');
                    break;
                default:
                    break;
            }
        },
        deleteDefault: function (key) {
            switch (key) {
                case 'api-key':
                    localStorage.removeItem('default-api-key');
                    break;
                case 'source':
                    localStorage.removeItem('default-source');
                default:
                    break;
            }
        }
    },
    components: {
        presenceView: {
            props: {
                data: Object,
                sourceid: String,
                query: String
            },
            computed: {
                filteredItems: function () {
                    if (this.query.length > 0) {
                        return this.data.filter(item => item.trackingId.includes(this.query));
                    } else {
                        return this.data;
                    }
                }
            },
            template: '<ul class="list-group"><presence-item v-for="item in filteredItems" v-bind:presence="item"></presence-item></ul>'
        },
        accelerometerView: {
            props: ['data', 'sourceid'],
            template: '<div class="card text-white bg-dark mb-3" style="max-width: 20rem;">\
                        <div class="card-header"><i class="fa fa-arrows-alt fa-lg" aria-hidden="true"></i> Accelerometer (sensitivity: {{ data.sensitivity }})</div>\
                        <div class="card-body">\
                            <h4 class="card-title"><span class="text-monospace">{{ sourceid }}</span></h4>\
                            <p class="card-text">Acceleration:<ul>\
                                <li>X axis: {{ data.x * data.sensitivity }} m<i>ɡ</i><sub>0</sub></li>\
                                <li>Y axis: {{ data.y * data.sensitivity }} m<i>ɡ</i><sub>0</sub></li>\
                                <li>Z axis: {{ data.z * data.sensitivity }} m<i>ɡ</i><sub>0</sub></li></ul>\
                            </p>\
                            <p class="card-text">Events:<ul>\
                                <li>Threshold: {{ data.lastThreshold }}</li>\
                                <li>Double tap: {{ data.lastDoubleTap }}</li></ul>\
                            </p>\
                            <p class="card-text"><i class="fa fa-podcast fa-lg fa-fw" aria-hidden="true"></i> <span class="text-monospace">{{ data.sourceId }}</span></p>\
                        </div>\
                    </div>'
        },
        sensorView: {
            props: ['data', 'sourceid'],
            computed: {
                temperature: function () {
                    if (this.data.temperature === 255) {
                        return 'Not available';
                    } else {
                        return this.data.temperature + '°C';
                    }
                },
                lightLevel: function () {
                    if (this.data.lightLevel === 255) {
                        return 'Not available';
                    } else {
                        return this.data.temperature + '/100';
                    }
                }
            },
            template: '<div class="card text-white bg-info mb-3" style="max-width: 20rem;">\
                        <div class="card-header"><i class="fa fa-bar-chart fa-lg" aria-hidden="true"></i> Other sensor readings</div>\
                        <div class="card-body">\
                            <h4 class="card-title"><span class="text-monospace">{{ sourceid }}</span></h4>\
                            <p class="card-text"><i class="fa fa-lightbulb-o fa-lg fa-fw" aria-hidden="true"></i> {{ lightLevel }}<br><i class="fa fa-thermometer-half fa-lg fa-fw" aria-hidden="true"></i> {{ temperature }}<br><i class="fa fa-podcast fa-lg fa-fw" aria-hidden="true"></i> <span class="text-monospace">{{ data.sourceId }}</span></p>\
                        </div>\
                    </div>'
        },
        healthView: {
            props: ['data', 'sourceid'],
            computed: {
                batteryLevel: function () {
                    // TODO: Implement this
                }
            },
            template: '<div class="card text-white bg-success mb-3" style="max-width: 20rem;">\
                        <div class="card-header"><i class="fa fa-heartbeat fa-lg" aria-hidden="true"></i> Beacon health</div>\
                        <div class="card-body">\
                            <h4 class="card-title"><span class="text-monospace">{{ sourceid }}</span></h4>\
                            <p class="card-text"><i class="fa fa-clock-o fa-lg fa-fw" aria-hidden="true"></i> {{ data.deviceUtcTime }}<br><i class="fa fa-battery-three-quarters fa-lg fa-fw" aria-hidden="true"></i> {{ data.batteryLevel }}%<br><i class="fa fa-podcast fa-lg fa-fw" aria-hidden="true"></i> <span class="text-monospace">{{ data.sourceId }}</span></p>\
                        </div>\
                    </div>'
        },
        buttonView: {
            props: ['data', 'sourceid'],
            computed: {
                lastSingleClick: function () {
                    if (this.data.lastSingleClick === 65535) {
                        return 'No recent single click event';
                    } else {
                        return this.data.lastSingleClick + ' second(s) ago';
                    }
                }
            },
            template: '<div class="card text-white bg-success mb-3" style="max-width: 20rem;">\
                        <div class="card-header"><i class="fa fa-chevron-circle-down fa-lg" aria-hidden="true"></i> Button clicked</div>\
                        <div class="card-body">\
                            <h4 class="card-title"><span class="text-monospace">{{ sourceid }}</span></h4>\
                            <p class="card-text"><i class="fa fa-clock-o fa-lg fa-fw" aria-hidden="true"></i> {{ lastSingleClick }}<br><i class="fa fa-podcast fa-lg fa-fw" aria-hidden="true"></i> <span class="text-monospace">{{ data.sourceId }}</span></p>\
                        </div>\
                    </div>'
        },
        initialView: {
            template: '<div class="card" style="width: 20rem;">\
                        <img class="card-img-top" src="resources/cat.jpg" alt="Picture of a cute cat">\
                        <div class="card-body">\
                            <p class="card-text">No stream has been initiated yet, so here\'s a picture of a cat instead</p>\
                        </div>\
                    </div>'
        }
    }
})

Vue.component('presence-item', {
    props: ['presence'],
    template: '<li class="list-group-item d-flex justify-content-between align-items-center">\
                <div><i class="fa fa-clock-o fa-lg fa-fw" aria-hidden="true"></i> <span class="text-monospace">{{ presence.timestamp }}</span>, Source: <span class="text-monospace">{{ presence.sourceId }}</span>, Tracking ID: <span class="text-monospace">{{ presence.trackingId }}</span>, <i class="fa fa-signal" aria-hidden="true"></i> <span class="text-monospace">{{ presence.rssi }}</span> dBm, Proximity: <span class="text-monospace">{{ presence.proximity }}</span>, Device address: <span class="text-monospace">{{ presence.deviceAddress }}</span></div>\
                <span class="badge badge-primary badge-pill"><scan-type-pill v-bind:scantype="presence.scanType"></scan-type-pill></span>\
            </li>'
});

Vue.component('scan-type-pill', {
    props: ['scantype'],
    computed: {
        classObject: function () {
            return {
                'fa': true,
                'fa-bluetooth-b': this.scantype === 'BLE',
                'fa-wifi': this.scantype === 'WIFI',
                'fa-question': this.scantype != 'BLE' && this.scantype != 'WIFI',
                'fa-fw': true,
                'fa-2x': true
            }
        }
    },
    template: '<i v-bind:class="classObject" aria-hidden="true"></i>'
});