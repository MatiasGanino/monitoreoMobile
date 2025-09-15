import {StyleSheet} from 'react-native';

const Styles = StyleSheet.create({
  login_container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#16325c',
    alignItems: 'center',
    flex: 0,
    flexDirection: "row"
  },
  header_text: {
    color: '#f0f0f0',
    fontSize: 16,
  },
  header_text_bold: {
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#16325c', // Fondo azul oscuro
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fingerprintIcon: {
    fontSize: 80,
    marginBottom: 24,
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#f0f0f0',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
  },
  tobilleraImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tobilleraImage: {
    width: 160,
    height: 160,
    resizeMode: 'cover',
  },
  pickerContainer: {
    backgroundColor: '#fff2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff4',
  },
});

export default Styles;
