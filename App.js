import {useEffect, useState, useRef, useCallback} from 'react';
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import {SafeAreaView, Text, View, Alert, Image, TouchableOpacity} from "react-native";
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
import Styles from "./Styles";

//axios.defaults.baseURL = 'http://192.168.0.212:8888'; // local url
axios.defaults.baseURL = 'http://seguimiento-unsam-test.ecyt.net.ar'; // public url
axios.interceptors.response.use(
    function (response) {
        return response;
    },
    function (error) {
        const err = (error + '').includes('Network Error') ? 'Verifique su conexión a Internet' : error;
        return Promise.reject(new Error(err));
    }
);

const App = () => {
    const [ubicacion, setUbicacion] = useState(null);
    const [errorUbicacion, setErrorUbicacion] = useState(null);
    const [mostrandoHuella, setMostrandoHuella] = useState(false);
    const [personas, setPersonas] = useState([]);
    const [idPersonaSeleccionada, setIdPersonaSeleccionada] = useState(null);
    const autenticado = useRef(false);
    const huellaEnProceso = useRef(false);
    const ubicacionEnProceso = useRef(false);

    useEffect(() => {
        // Guardar la URL base en SecureStore si lo necesitas en otros lugares
        SecureStore.setItemAsync('publicURL', axios.defaults.baseURL);
    }, []);

    useEffect(() => {
        // Obtener personas
        console.log('Intentando obtener personas desde:', axios.defaults.baseURL + '/api/personas');
        axios.get('/api/personas')
            .then(res => {
                setPersonas(res.data);
                console.log('Personas obtenidas:', res.data);
                if (res.data.length > 0) setIdPersonaSeleccionada(res.data[0].id);
            })
            .catch((err) => {
                setPersonas([]);
                console.error('Error al obtener personas:', err);
                Alert.alert('Error', 'No se pudo obtener la lista de personas.\n' + err);
            });
    }, []);

    const obtenerUbicacion = useCallback(async () => {
        setErrorUbicacion(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorUbicacion('Permiso de ubicación denegado');
                setUbicacion(null);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const nuevaUbicacion = {
                latitud: location.coords.latitude,
                longitud: location.coords.longitude,
                timestamp: new Date(location.timestamp).toLocaleString()
            };
            setUbicacion(nuevaUbicacion);
            console.log('Ubicación obtenida:', nuevaUbicacion);

            // Enviar al backend usando axios
            try {
                if (!idPersonaSeleccionada) return;
                const response = await axios.post('/api/ubicaciones', {
                    idPersona: idPersonaSeleccionada, // Usar el ID seleccionado
                    latitud: nuevaUbicacion.latitud,
                    longitud: nuevaUbicacion.longitud,
                    fechaHora: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
                });
                if (response.status !== 200 && response.status !== 201) {
                    Alert.alert('Error', 'No se pudo enviar la ubicación');
                }
            } catch (error) {
                console.error('Error enviando ubicación:', error);
                Alert.alert('Error', 'No se pudo enviar la ubicación al backend');
            }

        } catch (_e) {
            setErrorUbicacion('No se pudo obtener la ubicación');
            setUbicacion(null);
        }
    }, [idPersonaSeleccionada]);

    useEffect(() => {
        let interval;
        interval = setInterval(async () => {
            if (ubicacionEnProceso.current) return;
            try {
                if (!idPersonaSeleccionada) return;
                const res = await axios.get('/api/llamadas/ultima-pendiente', {
                    params: { idpersona: idPersonaSeleccionada }
                });
                const hayPendiente = Array.isArray(res.data) && res.data.length > 0;
                if (hayPendiente && !autenticado.current && !huellaEnProceso.current) {
                    huellaEnProceso.current = true;
                    const tieneBiometrico = await LocalAuthentication.hasHardwareAsync();
                    const soportaHuella = await LocalAuthentication.isEnrolledAsync();
                    if (!tieneBiometrico || !soportaHuella) {
                        if (res.data[0] && res.data[0].id) {
                            await axios.put(`/api/llamadas/${res.data[0].id}`, { estado: 'Rechazado' });
                        }
                        Alert.alert('Sin huella', 'El dispositivo no tiene huella registrada.');
                        huellaEnProceso.current = false;
                        return;
                    }
                    await handleAuth();
                    huellaEnProceso.current = false;
                } else if (!hayPendiente) {
                    autenticado.current = false;
                }
                if (autenticado.current || !hayPendiente) {
                    ubicacionEnProceso.current = true;
                    await obtenerUbicacion();
                    ubicacionEnProceso.current = false;
                }
            } catch (_e) {
                setErrorUbicacion('No se pudo verificar el estado de llamada.');
                ubicacionEnProceso.current = false;
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [idPersonaSeleccionada, obtenerUbicacion, handleAuth]);

    const playAuthSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('./assets/sounds/new-notification.mp3'),
                { shouldPlay: true, isLooping: true }
            );
            await sound.playAsync();
            return sound;
        } catch (error) {
            console.log('Error reproduciendo sonido:', error);
            return null;
        }
    };

    const handleAuth = async () => {
        const sound = await playAuthSound(); // Reproducir sonido en bucle
        setMostrandoHuella(true);
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Seguimiento biométrico\n\nLlamada de control. Por favor identifíquese mediante la huella.',
            disableDeviceFallback: true,
        });
        setMostrandoHuella(false);
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
        }
        // Lógica de resultado
        try {
            const res = await axios.get('/api/llamadas/ultima-pendiente', {
                params: { idpersona: idPersonaSeleccionada }
            });
            if (result.success) {
                autenticado.current = true;
                if (res.data[0] && res.data[0].id) {
                    await axios.put(`/api/llamadas/${res.data[0].id}`, { estado: 'Verificado' });
                }
            } else {
                if (res.data[0] && res.data[0].id) {
                    await axios.put(`/api/llamadas/${res.data[0].id}`, { estado: 'Rechazado' });
                }
                Alert.alert('Autenticación fallida', 'Debes autenticarte para continuar.');
            }
        } catch {}
    };

    return (
        <SafeAreaView style={Styles.container}>
            <View style={Styles.logoContainer}>
                <Image source={require('./assets/images/Logo_UNSAM.png')} style={Styles.logoImage} />
            </View>
            <View style={{ alignItems: 'center', marginTop: 0 }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
                    Seguimiento Biométrico
                </Text>
            </View>
            <View style={Styles.centered}>
                {/* Desplegable para elegir persona */}
                <View style={Styles.pickerContainer}>
                    <Text style={Styles.title}>Persona</Text>
                    <Picker
                        selectedValue={idPersonaSeleccionada}
                        style={{ height: 60, width: 240, color: '#16325c', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10 }} // Alto mayor y padding vertical
                        dropdownIconColor="#16325c"
                        onValueChange={(itemValue) => setIdPersonaSeleccionada(itemValue)}
                    >
                        {personas.map(persona => (
                            <Picker.Item key={persona.id} label={persona.nombre || `Persona ${persona.id}`} value={persona.id} />
                        ))}
                    </Picker>
                </View>
                <View style={Styles.tobilleraImageContainer}>
                    <Image source={require('./assets/images/tobillera.png')} style={Styles.tobilleraImage} />
                </View>
                {ubicacion && (
                    <View style={{marginTop: 20, backgroundColor: '#fff2', borderRadius: 10, padding: 12}}>
                        <Text style={{color:'#fff', fontWeight:'bold'}}>Ubicación registrada:</Text>
                        <Text style={{color:'#fff'}}>Latitud: {ubicacion.latitud}</Text>
                        <Text style={{color:'#fff'}}>Longitud: {ubicacion.longitud}</Text>
                        <Text style={{color:'#fff'}}>Fecha y hora: {ubicacion.timestamp}</Text>
                    </View>
                )}
                {errorUbicacion && (
                    <Text style={{color:'red', marginTop:10}}>{errorUbicacion}</Text>
                )}
            </View>
        </SafeAreaView>
    );
};

export default App;
