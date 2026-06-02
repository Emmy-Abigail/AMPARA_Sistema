// Ubigeo del Perú — fuente: INEI
// Estructura: departamentos → provincias → distritos

export const DEPARTAMENTOS: string[] = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
];

export const PROVINCIAS: Record<string, string[]> = {
  'Amazonas': ['Chachapoyas', 'Bagua', 'Bongará', 'Condorcanqui', 'Luya', 'Rodríguez de Mendoza', 'Utcubamba'],
  'Áncash': ['Huaraz', 'Aija', 'Antonio Raimondi', 'Asunción', 'Bolognesi', 'Carhuaz', 'Carlos F. Fitzcarrald', 'Casma', 'Corongo', 'Huari', 'Huarmey', 'Huaylas', 'Mariscal Luzuriaga', 'Ocros', 'Pallasca', 'Pomabamba', 'Recuay', 'Santa', 'Sihuas', 'Yungay'],
  'Apurímac': ['Abancay', 'Andahuaylas', 'Antabamba', 'Aymaraes', 'Cotabambas', 'Chincheros', 'Grau'],
  'Arequipa': ['Arequipa', 'Camaná', 'Caravelí', 'Castilla', 'Caylloma', 'Condesuyos', 'Islay', 'La Unión'],
  'Ayacucho': ['Huamanga', 'Cangallo', 'Huanca Sancos', 'Huanta', 'La Mar', 'Lucanas', 'Parinacochas', 'Páucar del Sara Sara', 'Sucre', 'Víctor Fajardo', 'Vilcas Huamán'],
  'Cajamarca': ['Cajamarca', 'Cajabamba', 'Celendín', 'Chota', 'Contumazá', 'Cutervo', 'Hualgayoc', 'Jaén', 'San Ignacio', 'San Marcos', 'San Miguel', 'San Pablo', 'Santa Cruz'],
  'Callao': ['Callao'],
  'Cusco': ['Cusco', 'Acomayo', 'Anta', 'Calca', 'Canas', 'Canchis', 'Chumbivilcas', 'Espinar', 'La Convención', 'Paruro', 'Paucartambo', 'Quispicanchi', 'Urubamba'],
  'Huancavelica': ['Huancavelica', 'Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huaytará', 'Tayacaja'],
  'Huánuco': ['Huánuco', 'Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Leoncio Prado', 'Marañón', 'Pachitea', 'Puerto Inca', 'Lauricocha', 'Yarowilca'],
  'Ica': ['Ica', 'Chincha', 'Nasca', 'Palpa', 'Pisco'],
  'Junín': ['Huancayo', 'Chanchamayo', 'Chupaca', 'Concepción', 'Jauja', 'Junín', 'Satipo', 'Tarma', 'Yauli'],
  'La Libertad': ['Trujillo', 'Ascope', 'Bolívar', 'Chepén', 'Gran Chimú', 'Julcán', 'Otuzco', 'Pacasmayo', 'Pataz', 'Sánchez Carrión', 'Santiago de Chuco', 'Virú'],
  'Lambayeque': ['Chiclayo', 'Ferreñafe', 'Lambayeque'],
  'Lima': ['Lima', 'Barranca', 'Cajatambo', 'Canta', 'Cañete', 'Huaral', 'Huarochirí', 'Huaura', 'Oyón', 'Yauyos'],
  'Loreto': ['Maynas', 'Alto Amazonas', 'Datem del Marañón', 'Loreto', 'Mariscal Ramón Castilla', 'Putumayo', 'Requena', 'Ucayali'],
  'Madre de Dios': ['Tambopata', 'Manu', 'Tahuamanu'],
  'Moquegua': ['Mariscal Nieto', 'General Sánchez Cerro', 'Ilo'],
  'Pasco': ['Pasco', 'Daniel Alcides Carrión', 'Oxapampa'],
  'Piura': ['Piura', 'Ayabaca', 'Huancabamba', 'Morropón', 'Paita', 'Sechura', 'Sullana', 'Talara'],
  'Puno': ['Puno', 'Azángaro', 'Carabaya', 'Chucuito', 'El Collao', 'Huancané', 'Lampa', 'Melgar', 'Moho', 'San Antonio de Putina', 'San Román', 'Sandia', 'Yunguyo'],
  'San Martín': ['Moyobamba', 'Bellavista', 'El Dorado', 'Huallaga', 'Lamas', 'Mariscal Cáceres', 'Picota', 'Rioja', 'San Martín', 'Tocache'],
  'Tacna': ['Tacna', 'Candarave', 'Jorge Basadre', 'Tarata'],
  'Tumbes': ['Tumbes', 'Contralmirante Villar', 'Zarumilla'],
  'Ucayali': ['Coronel Portillo', 'Atalaya', 'Padre Abad', 'Purús'],
};

export const DISTRITOS: Record<string, Record<string, string[]>> = {
  'Amazonas': {
    'Chachapoyas': ['Chachapoyas', 'Asunción', 'Balsas', 'Cheto', 'Chiliquín', 'Chistán', 'El Faique', 'Granada', 'Huancas', 'La Jalca', 'Leimebamba', 'Levanto', 'Magdalena', 'Mariscal Castilla', 'Molinopampa', 'Montevideo', 'Olleros', 'Quinjalca', 'San Francisco de Daguas', 'San Isidro de Maino', 'Soloco', 'Sonche'],
    'Bagua': ['Bagua', 'Aramango', 'Copallin', 'El Parco', 'Imaza', 'La Peca'],
    'Bongará': ['Jumbilla', 'Chisquilla', 'Churuja', 'Corosha', 'Cuispes', 'Florida', 'Jazán', 'Recta', 'San Carlos', 'Shipasbamba', 'Valera', 'Yambrasbamba'],
    'Condorcanqui': ['Nieva', 'El Cenepa', 'Río Santiago'],
    'Luya': ['Lamud', 'Camporredondo', 'Cocabamba', 'Colcamar', 'Conila', 'Inguilpata', 'Longuita', 'Lonya Chico', 'Luya', 'Luya Viejo', 'María', 'Ocalli', 'Ocumal', 'Pisuquia', 'Providencia', 'San Cristóbal', 'San Francisco del Yeso', 'San Jerónimo', 'San Juan de Lopecancha', 'Santa Catalina', 'Santo Tomás', 'Tingo', 'Trita'],
    'Rodríguez de Mendoza': ['San Nicolás', 'Chirimoto', 'Cochamal', 'Huambo', 'Limabamba', 'Longar', 'Mariscal Benavides', 'Milpuc', 'Omia', 'Santa Rosa', 'Totora', 'Vista Alegre'],
    'Utcubamba': ['Bagua Grande', 'Cajaruro', 'Cumba', 'El Milagro', 'Jamalca', 'Lonya Grande', 'Yamón'],
  },
  'Áncash': {
    'Huaraz': ['Huaraz', 'Cochabamba', 'Colcabamba', 'Huanchay', 'Independencia', 'Jangas', 'La Libertad', 'Llanganuco', 'Olleros', 'Pampas', 'Pampas Grande', 'Paucas', 'Pira', 'Taricá'],
    'Santa': ['Chimbote', 'Cáceres del Perú', 'Coishco', 'Macate', 'Moro', 'Nepeña', 'Samanco', 'Santa', 'Nuevo Chimbote'],
    'Carhuaz': ['Carhuaz', 'Acopampa', 'Amashca', 'Anta', 'Ataquero', 'Marcará', 'Pampas', 'San Miguel de Aco', 'Shilla', 'Tinco', 'Yungar'],
    'Yungay': ['Yungay', 'Cascapara', 'Mancos', 'Matacoto', 'Quillo', 'Ranrahirca', 'Shupluy', 'Yanama'],
    'Recuay': ['Recuay', 'Catac', 'Cotaparaco', 'Huayllapampa', 'Llacllin', 'Marca', 'Pampas Chico', 'Pampas Grande', 'Pátac', 'Tapacocha', 'Ticapampa'],
    'Huari': ['Huari', 'Anra', 'Cajay', 'Chavin de Huantar', 'Huachis', 'Huantar', 'Masin', 'Paucas', 'Ponto', 'Rahuapampa', 'Rapayán', 'San Marcos', 'San Pedro de Chaná', 'Uco'],
    'Bolognesi': ['Chiquián', 'Abelardo Pardo Lezameta', 'Antonio Raymondi', 'Aquia', 'Cajacay', 'Canis', 'Colquioc', 'Huallanca', 'Huasta', 'Huayllacayán', 'La Primavera', 'Mangas', 'Pacllon', 'San Miguel de Corpanqui', 'Ticllos'],
    'Casma': ['Casma', 'Buenavista Alta', 'Comandante Noel', 'Yaután'],
    'Pallasca': ['Cabana', 'Bolognesi', 'Conchucos', 'Huacaschuque', 'Huandoval', 'Lacabamba', 'Llapo', 'Pallasca', 'Pampas', 'Santa Rosa', 'Tauca'],
    'Sihuas': ['Sihuas', 'Acobamba', 'Alfonso Ugarte', 'Cashapampa', 'Chingalpo', 'Huayllabamba', 'Quiches', 'Ragash', 'San Juan', 'Sicsibamba'],
    'Huaylas': ['Caraz', 'Huallanca', 'Huata', 'Huaylas', 'Mato', 'Pamparomas', 'Pueblo Libre', 'Santa Cruz', 'Santo Toribio', 'Yuracmarca'],
    'Pomabamba': ['Pomabamba', 'Huayllan', 'Parobamba', 'Quinuabamba'],
    'Aija': ['Aija', 'Coris', 'Huacllán', 'La Merced', 'Succha'],
    'Ocros': ['Ocros', 'Acas', 'Cajamarquilla', 'Carhuapampa', 'Cochas', 'Congas', 'Llipa', 'San Cristóbal de Raján', 'San Pedro', 'Santiago de Chilcas'],
    'Corongo': ['Corongo', 'Aco', 'Bambas', 'Cusca', 'La Pampa', 'Pampas', 'Yanac'],
    'Asunción': ['Chacas', 'Acochaca'],
    'Antonio Raimondi': ['Llamellín', 'Aczo', 'Chichis', 'Mirgas', 'San Juan de Rontoy'],
    'Carlos F. Fitzcarrald': ['San Luis', 'San Nicolás', 'Yauya'],
    'Mariscal Luzuriaga': ['Piscobamba', 'Casca', 'Eleazar Guzmán Barrón', 'Fidel Olivas Escudero', 'Llumpa', 'Lucma', 'Musga'],
    'Huarmey': ['Huarmey', 'Cochapetí', 'Culebras', 'Huayan', 'Malvas'],
  },
  'Apurímac': {
    'Abancay': ['Abancay', 'Chacoche', 'Circa', 'Curahuasi', 'Huanipaca', 'Lambrama', 'Pichirhua', 'San Pedro de Cachora', 'Tamburco'],
    'Andahuaylas': ['Andahuaylas', 'Andarapa', 'Chiara', 'Huancarama', 'Huancaray', 'Huayana', 'Kishuara', 'Pacobamba', 'Pacucha', 'Pampachiri', 'Pomacocha', 'San Antonio de Cachi', 'San Jerónimo', 'San Miguel de Chaccrampa', 'Santa María de Chicmo', 'Talavera', 'Tumay Huaraca', 'Turpo', 'Kaquiabamba', 'José María Arguedas'],
    'Antabamba': ['Antabamba', 'El Oro', 'Huaquirca', 'Juan Espinoza Medrano', 'Mollebamba', 'Mollepata', 'Sabaino', 'Totora'],
    'Aymaraes': ['Chalhuanca', 'Capaya', 'Caraybamba', 'Chapimarca', 'Colcabamba', 'Cotaruse', 'Huayllo', 'Justo Apu Sahuaraura', 'Lucre', 'Pocohuanca', 'San Juan de Chañas', 'Sañayca', 'Soraya', 'Tapairihua', 'Tintay', 'Toraya', 'Yanaca'],
    'Cotabambas': ['Tambobamba', 'Cotabambas', 'Coyllurqui', 'Haquira', 'Mara', 'Challhuahuacho'],
    'Chincheros': ['Chincheros', 'Anco-Huallo', 'Cocharcas', 'Huaccana', 'Ocobamba', 'Ongoy', 'Uranmarca', 'Ranracancha'],
    'Grau': ['Chuquibambilla', 'Curpahuasi', 'Gamarra', 'Huayllati', 'Mamara', 'Micaela Bastidas', 'Pataypampa', 'Progreso', 'San Antonio', 'Santa Rosa', 'Turpay', 'Vilcabamba', 'Virundo', 'Curasco'],
  },
  'Arequipa': {
    'Arequipa': ['Arequipa', 'Alto Selva Alegre', 'Cayma', 'Cerro Colorado', 'Characato', 'Chiguata', 'Jacobo Hunter', 'José Luis Bustamante y Rivero', 'La Joya', 'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi', 'Polobaya', 'Quequeña', 'Sabandía', 'Sachaca', 'San Juan de Siguas', 'San Juan de Tarucani', 'Santa Isabel de Siguas', 'Santa Rita de Siguas', 'Socabaya', 'Tiabaya', 'Tigre', 'Tingo', 'Uchumayo', 'Vítor', 'Yanahuara', 'Yarabamba', 'Yura'],
    'Camaná': ['Camaná', 'José María Quimper', 'Mariscal Cáceres', 'Mariscal Ramón Castilla', 'Nicolás de Piérola', 'Ocoña', 'Quilca', 'Samuel Pastor'],
    'Caravelí': ['Caravelí', 'Acarí', 'Atico', 'Atiquipa', 'Bella Unión', 'Cahuacho', 'Chala', 'Chaparra', 'Huanuhuanu', 'Jaquí', 'Lomas', 'Quicacha', 'Yauca'],
    'Castilla': ['Aplao', 'Andagua', 'Ayo', 'Chachas', 'Chilcaymarca', 'Choco', 'Huancarqui', 'Machaguay', 'Orcopampa', 'Pampacolca', 'Puyca', 'Quilca', 'Rio Grande', 'Salamanca', 'Tipán', 'Toro', 'Uñón', 'Uraca', 'Viraco'],
    'Caylloma': ['Chivay', 'Achoma', 'Cabanaconde', 'Callalli', 'Caylloma', 'Coporaque', 'Huambo', 'Huanca', 'Ichupampa', 'Lari', 'Lluta', 'Maca', 'Madrigal', 'San Antonio de Chuca', 'Sibayo', 'Tapay', 'Tisco', 'Tuti', 'Yanque', 'Majes'],
    'Condesuyos': ['Chuquibamba', 'Andaray', 'Cayarani', 'Chichas', 'Iray', 'Río Grande', 'Salamanca', 'Yanaquihua'],
    'Islay': ['Mollendo', 'Cocachacra', 'Dean Valdivia', 'Islay', 'Mejía', 'Punta de Bombón'],
    'La Unión': ['Cotahuasi', 'Alca', 'Charcana', 'Huaynacotas', 'Pampamarca', 'Puyca', 'Quechualla', 'Sayla', 'Tauria', 'Tomepampa', 'Toro'],
  },
  'Ayacucho': {
    'Huamanga': ['Ayacucho', 'Acocro', 'Acos Vinchos', 'Carmen Alto', 'Chiara', 'Jesús Nazareno', 'Ocros', 'Pacaycasa', 'Quinua', 'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos', 'Tambillo', 'Vinchos', 'Jesús de Nazareno'],
    'Cangallo': ['Cangallo', 'Chuschi', 'Los Morochucos', 'María Parado de Bellido', 'Paras', 'Totos'],
    'Huanta': ['Huanta', 'Ayahuanco', 'Huamanguilla', 'Iguaín', 'Luricocha', 'Santillana', 'Sivia', 'Llochegua', 'Canayre', 'Uchuraccay', 'Pucacolpa', 'Chaca'],
    'La Mar': ['San Miguel', 'Anco', 'Ayna', 'Chilcas', 'Chungui', 'Luis Carranza', 'Santa Rosa', 'Tambo', 'Samugari', 'Anchihuay'],
    'Lucanas': ['Puquio', 'Aucara', 'Cabana', 'Carmen Salcedo', 'Chaviña', 'Chipao', 'Huac-Huas', 'Laramate', 'Leoncio Prado', 'Llauta', 'Lucanas', 'Ocaña', 'Otoca', 'Saisa', 'San Cristóbal', 'San Juan', 'San Pedro', 'San Pedro de Palco', 'Sancos', 'Santa Ana de Huaycahuacho', 'Santa Lucia'],
    'Parinacochas': ['Coracora', 'Chumpi', 'Coronel Castañeda', 'Pacapausa', 'Pullo', 'Puyusca', 'San Francisco de Ravacayco', 'Upahuacho'],
    'Páucar del Sara Sara': ['Pausa', 'Colta', 'Corculla', 'Lampa', 'Marcabamba', 'Oyolo', 'Pararca', 'San Javier de Alpabamba', 'San José de Ushua', 'Sara Sara'],
    'Sucre': ['Querobamba', 'Belén', 'Chalcos', 'Chilcayoc', 'Huacaña', 'Morcolla', 'Paico', 'San Salvador de Quije', 'Santiago de Paucaray', 'Soras'],
    'Víctor Fajardo': ['Huancapi', 'Alcamenca', 'Apongo', 'Asquipata', 'Canaria', 'Cayara', 'Colca', 'Huamanquiquia', 'Huancaraylla', 'Huaya', 'Sarhua', 'Vilcanchos'],
    'Vilcas Huamán': ['Vilcas Huamán', 'Accomarca', 'Carhuanca', 'Concepción', 'Huambalpa', 'Independencia', 'Saurama', 'Vischongo'],
    'Huanca Sancos': ['Sancos', 'Carapo', 'Sacsamarca', 'Santiago de Lucanamarca'],
  },
  'Cajamarca': {
    'Cajamarca': ['Cajamarca', 'Asunción', 'Chetilla', 'Cospán', 'Encañada', 'Jesús', 'Llacanora', 'Los Baños del Inca', 'Magdalena', 'Matara', 'Namora', 'San Juan'],
    'Jaén': ['Jaén', 'Bellavista', 'Chontali', 'Colasay', 'Huabal', 'Las Pirias', 'Pomahuaca', 'Pucará', 'Sallique', 'San Felipe', 'San José del Alto', 'Santa Rosa'],
    'Chota': ['Chota', 'Anguia', 'Chadin', 'Chiguirip', 'Chimban', 'Choropampa', 'Cochabamba', 'Conchan', 'Huambos', 'Lajas', 'Llama', 'Miracosta', 'Paccha', 'Pion', 'Querocoto', 'San Juan de Licupis', 'Tacabamba', 'Tocmoche', 'Chalamarca'],
    'Cajabamba': ['Cajabamba', 'Cachachi', 'Condebamba', 'Sitacocha'],
    'Celendín': ['Celendín', 'Chumuch', 'Cortegana', 'Huasmin', 'Jorge Chávez', 'José Gálvez', 'Miguel Iglesias', 'Oxamarca', 'Sorochuco', 'Sucre', 'Utco', 'La Libertad de Pallán'],
    'Cutervo': ['Cutervo', 'Callayuc', 'Cujillo', 'La Ramada', 'Pimpingos', 'Querocotillo', 'San Andrés de Cutervo', 'San Juan de Cutervo', 'San Luis de Lucma', 'Santa Cruz', 'Santo Domingo de la Capilla', 'Santo Tomás', 'Socota', 'Toribio Casanova'],
    'Hualgayoc': ['Bambamarca', 'Chugur', 'Hualgayoc'],
    'San Ignacio': ['San Ignacio', 'Chirinos', 'Huarango', 'La Coipa', 'Namballe', 'San José de Lourdes', 'Tabaconas'],
    'San Marcos': ['Pedro Gálvez', 'Chancay', 'Eduardo Villanueva', 'Gregorio Pita', 'Ichocan', 'José Manuel Quiroz', 'José Sabogal'],
    'San Miguel': ['San Miguel', 'Bolívar', 'Calquis', 'Catilluc', 'El Prado', 'La Florida', 'Llapa', 'Nanchoc', 'Niepos', 'San Gregorio', 'San Silvestre de Cochán', 'Tongod', 'Unión Agua Blanca'],
    'San Pablo': ['San Pablo', 'San Bernardino', 'San Luis', 'Tumbadén'],
    'Santa Cruz': ['Santa Cruz', 'Andabamba', 'Catache', 'Chancaybaños', 'La Esperanza', 'Ninabamba', 'Pulan', 'Saucepampa', 'Sexi', 'Uticyacu', 'Yauyucán'],
    'Contumazá': ['Contumazá', 'Chilete', 'Cupisnique', 'Guzmango', 'San Benito', 'Santa Cruz de Toledo', 'Tantarica', 'Yonán'],
  },
  'Callao': {
    'Callao': ['Callao', 'Bellavista', 'Carmen de La Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'],
  },
  'Cusco': {
    'Cusco': ['Cusco', 'Ccorca', 'Poroy', 'San Jerónimo', 'San Sebastián', 'Santiago', 'Saylla', 'Wanchaq'],
    'Anta': ['Anta', 'Ancahuasi', 'Cachimayo', 'Chinchaypujio', 'Huarocondo', 'Limatambo', 'Mollepata', 'Pucyura', 'Zurite'],
    'Calca': ['Calca', 'Coya', 'Lamay', 'Lares', 'Pisac', 'San Salvador', 'Taray', 'Yanatile'],
    'Canas': ['Yanaoca', 'Checca', 'Kunturkanki', 'Langui', 'Layo', 'Pampamarca', 'Quehue', 'Túpac Amaru'],
    'Canchis': ['Sicuani', 'Checacupe', 'Combapata', 'Maranganí', 'Pitumarca', 'San Pablo', 'San Pedro', 'Tinta'],
    'Chumbivilcas': ['Santo Tomás', 'Capacmarca', 'Chamaca', 'Colquemarca', 'Livitaca', 'Llusco', 'Quiñota', 'Velille'],
    'Espinar': ['Espinar', 'Condoroma', 'Coporaque', 'Ocoruro', 'Pallpata', 'Pichigua', 'Suyckutambo', 'Alto Pichigua'],
    'La Convención': ['Santa Ana', 'Echarate', 'Huayopata', 'Maranura', 'Ocobamba', 'Quellouno', 'Kimbiri', 'Santa Teresa', 'Vilcabamba', 'Pichari', 'Inkawasi'],
    'Paruro': ['Paruro', 'Accha', 'Ccapi', 'Colcha', 'Huanoquite', 'Omacha', 'Paccaritambo', 'Pillpinto', 'Yaurisque'],
    'Paucartambo': ['Paucartambo', 'Caicay', 'Challabamba', 'Colquepata', 'Huancarani', 'Kosñipata'],
    'Quispicanchi': ['Urcos', 'Andahuaylillas', 'Camanti', 'Ccarhuayo', 'Ccatca', 'Cusipata', 'Huaro', 'Lucre', 'Marcapata', 'Ocongate', 'Oropesa', 'Quiquijana'],
    'Urubamba': ['Urubamba', 'Chinchero', 'Huayllabamba', 'Machupicchu', 'Maras', 'Ollantaytambo', 'Yucay'],
    'Acomayo': ['Acomayo', 'Acopia', 'Acos', 'Mosoc Llacta', 'Pomacanchi', 'Rondocan', 'Sangarará'],
  },
  'Huancavelica': {
    'Huancavelica': ['Huancavelica', 'Acobambilla', 'Acoria', 'Conayca', 'Cuenca', 'Huachocolpa', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres', 'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli'],
    'Acobamba': ['Acobamba', 'Andabamba', 'Anta', 'Caja', 'Marcas', 'Paucara', 'Pomacocha', 'Rosario'],
    'Angaraes': ['Lircay', 'Anchonga', 'Callanmarca', 'Ccochaccasa', 'Chincho', 'Congalla', 'Huanca-Huanca', 'Huayllay Grande', 'Julcamarca', 'San Antonio de Antaparco', 'Santo Tomás de Pata', 'Secclla'],
    'Castrovirreyna': ['Castrovirreyna', 'Arma', 'Aurahua', 'Capillas', 'Chupamarca', 'Cocas', 'Huachos', 'Huamatambo', 'Mollepampa', 'San Juan', 'Santa Ana', 'Tantara', 'Ticrapo'],
    'Churcampa': ['Churcampa', 'Chinchihuasi', 'El Carmen', 'La Merced', 'Locroja', 'Paucarbamba', 'San Miguel de Mayocc', 'San Pedro de Coris', 'Pachamarca', 'Cosme'],
    'Huaytará': ['Huaytará', 'Ayavi', 'Córdova', 'Huayacundo Arma', 'Laramarca', 'Ocoyo', 'Pilpichaca', 'Querco', 'Quito-Arma', 'San Antonio de Cusicancha', 'San Francisco de Sangayaico', 'San Isidro', 'Santiago de Chocorvos', 'Santiago de Quirahuara', 'Santo Domingo de Capillas', 'Tambo'],
    'Tayacaja': ['Pampas', 'Acostambo', 'Acraquia', 'Ahuaycha', 'Colcabamba', 'Daniel Hernández', 'Huachocolpa', 'Huaribamba', 'Ñahuimpuquio', 'Pazos', 'Quishuar', 'Salcahuasi', 'San Marcos de Rocchac', 'Surcubamba', 'Tintay Puncu', 'Quichuas', 'Andaymarca', 'Roble', 'Pichos', 'Santiago de Tucuma'],
  },
  'Huánuco': {
    'Huánuco': ['Huánuco', 'Amarilis', 'Chinchao', 'Churubamba', 'Margos', 'Quisqui', 'San Francisco de Cayran', 'San Pedro de Chaulán', 'Santa María del Valle', 'Yarumayo', 'Pillco Marca'],
    'Ambo': ['Ambo', 'Cayna', 'Colpas', 'Conchamarca', 'Huacar', 'San Francisco', 'San Rafael', 'Tomay Kichwa'],
    'Leoncio Prado': ['Rupa-Rupa', 'Daniel Alomía Robles', 'Hermilio Valdizán', 'José Crespo y Castillo', 'Luyando', 'Mariano Dámaso Beraún', 'Pucayacu', 'Castillo Grande', 'Pueblo Nuevo', 'Santo Domingo de Anda'],
    'Dos de Mayo': ['La Unión', 'Chuquis', 'Marías', 'Pachas', 'Quivilla', 'Ripan', 'Shunqui', 'Sillapata', 'Yanas'],
    'Huacaybamba': ['Huacaybamba', 'Canchabamba', 'Cochabamba', 'Pinra'],
    'Huamalíes': ['Llata', 'Arancay', 'Chavín de Pariarca', 'Jacas Grande', 'Jircan', 'Miraflores', 'Monzón', 'Punchao', 'Puños', 'Singa', 'Tantamayo'],
    'Marañón': ['Huacrachuco', 'Cholon', 'San Buenaventura', 'La Morada', 'Santa Rosa de Alto Yanajanca'],
    'Pachitea': ['Panao', 'Chaglla', 'Molino', 'Umari'],
    'Puerto Inca': ['Puerto Inca', 'Codo del Pozuzo', 'Honoria', 'Tournavista', 'Yuyapichis'],
    'Lauricocha': ['Jesús', 'Baños', 'Jivia', 'Queropalca', 'Rondos', 'San Francisco de Asís', 'San Miguel de Cauri'],
    'Yarowilca': ['Chavinillo', 'Cahuac', 'Chacabamba', 'Aparicio Pomares', 'Jacas Chico', 'Obas', 'Pampamarca', 'Choras'],
  },
  'Ica': {
    'Ica': ['Ica', 'La Tinguiña', 'Los Aquijes', 'Ocucaje', 'Pachacútec', 'Parcona', 'Pueblo Nuevo', 'Salas', 'San José de Los Molinos', 'San Juan Bautista', 'Santiago', 'Subtanjalla', 'Tate', 'Yauca del Rosario'],
    'Chincha': ['Chincha Alta', 'Alto Larán', 'Chavín', 'Chincha Baja', 'El Carmen', 'Grocio Prado', 'Pueblo Nuevo', 'San Juan de Yanac', 'San Pedro de Huacarpana', 'Sunampe', 'Tambo de Mora'],
    'Nasca': ['Nasca', 'Changuillo', 'El Ingenio', 'Marcona', 'Vista Alegre'],
    'Palpa': ['Palpa', 'Llipata', 'Río Grande', 'Santa Cruz', 'Tibillo'],
    'Pisco': ['Pisco', 'Huancano', 'Humay', 'Independencia', 'Paracas', 'San Andrés', 'San Clemente', 'Tupac Amaru Inca'],
  },
  'Junín': {
    'Huancayo': ['Huancayo', 'Carhuacallanga', 'Chacapampa', 'Chicche', 'Chilca', 'Chongos Alto', 'Chupuro', 'Colca', 'Cullhuas', 'El Tambo', 'Huacrapuquio', 'Hualhuas', 'Huancan', 'Huasicancha', 'Huayucachi', 'Ingenio', 'Pariahuanca', 'Pilcomayo', 'Pucara', 'Quichuay', 'Quilcas', 'San Agustín', 'San Jerónimo de Tunán', 'Saño', 'Sapallanga', 'Sicaya', 'Santo Domingo de Acobamba', 'Viques'],
    'Chanchamayo': ['Chanchamayo', 'Perené', 'Pichanaqui', 'San Luis de Shuaro', 'San Ramón', 'Vitoc'],
    'Chupaca': ['Chupaca', 'Ahuac', 'Chongos Bajo', 'Huachac', 'Huamancaca Chico', 'San Juan de Iscos', 'San Juan de Jarpa', 'Tres de Diciembre', 'Yanacancha'],
    'Concepción': ['Concepción', 'Aco', 'Andamarca', 'Chambara', 'Cochas', 'Comas', 'Heroínas Toledo', 'Manzanares', 'Mariscal Castilla', 'Matahuasi', 'Mito', 'Nueve de Julio', 'Orcotuna', 'San José de Quero', 'Santa Rosa de Ocopa'],
    'Jauja': ['Jauja', 'Acolla', 'Apata', 'Ataura', 'Canchayllo', 'Curicaca', 'El Mantaro', 'Huamali', 'Huaripampa', 'Huertas', 'Janjaillo', 'Julcán', 'Leonor Ordóñez', 'Llocllapampa', 'Marco', 'Masma', 'Masma Chicche', 'Molinos', 'Monobamba', 'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancan', 'Parco', 'Pomacancha', 'Ricran', 'San Lorenzo', 'San Pedro de Chunan', 'Sausa', 'Sincos', 'Tunan Marca', 'Yauli', 'Yauyos'],
    'Junín': ['Junín', 'Carhuamayo', 'Ondores', 'Ulcumayo'],
    'Satipo': ['Satipo', 'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro', 'Río Tambo', 'Vizcatán del Ene'],
    'Tarma': ['Tarma', 'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo', 'San Pedro de Cajas', 'Tapo'],
    'Yauli': ['La Oroya', 'Chacapalpa', 'Huay-Huay', 'Marcapomacocha', 'Morococha', 'Paccha', 'Santa Bárbara de Carhuacayán', 'Santa Rosa de Sacco', 'Suitucancha', 'Yauli'],
  },
  'La Libertad': {
    'Trujillo': ['Trujillo', 'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza', 'Laredo', 'Moche', 'Poroto', 'Salaverry', 'Simbal', 'Víctor Larco Herrera'],
    'Ascope': ['Ascope', 'Chicama', 'Chocope', 'Magdalena de Cao', 'Paiján', 'Rázuri', 'Santiago de Cao', 'Casa Grande'],
    'Chepén': ['Chepén', 'Pacanga', 'Pueblo Nuevo'],
    'Pacasmayo': ['San Pedro de Lloc', 'Guadalupe', 'Jequetepeque', 'Pacasmayo', 'San José'],
    'Sánchez Carrión': ['Huamachuco', 'Chugay', 'Cochorco', 'Curgos', 'Marcabal', 'Sanagoran', 'Sarin', 'Sarín'],
    'Otuzco': ['Otuzco', 'Agallpampa', 'Charat', 'Huaranchal', 'La Cuesta', 'Mache', 'Paranday', 'Salpo', 'Sinsicap', 'Usquil'],
    'Pataz': ['Tayabamba', 'Buldibuyo', 'Chillia', 'Huaylillas', 'Huancaspata', 'Huayo', 'Ongón', 'Parcoy', 'Pataz', 'Pías', 'Santiago de Challas', 'Taurija', 'Urpay'],
    'Bolívar': ['Bolívar', 'Bambamarca', 'Condormarca', 'Longotea', 'Uchumarca', 'Ucuncha'],
    'Gran Chimú': ['Cascas', 'Lucma', 'Marmot', 'Sayapullo'],
    'Julcán': ['Julcán', 'Calamarca', 'Carabamba', 'Huaso'],
    'Santiago de Chuco': ['Santiago de Chuco', 'Angasmarca', 'Cachicadan', 'Mollebamba', 'Mollepata', 'Quiruvilca', 'Santa Cruz de Chuca', 'Sitabamba'],
    'Virú': ['Virú', 'Chao', 'Guadalupito'],
  },
  'Lambayeque': {
    'Chiclayo': ['Chiclayo', 'Chongoyape', 'Eten', 'Eten Puerto', 'José Leonardo Ortiz', 'La Victoria', 'Lagunas', 'Monsefú', 'Nueva Arica', 'Oyotún', 'Picsi', 'Pimentel', 'Reque', 'Santa Rosa', 'Saña', 'Cayaltí', 'Pátapo', 'Pomalca', 'Pucalá', 'Tumán'],
    'Ferreñafe': ['Ferreñafe', 'Cañaris', 'Incahuasi', 'Manuel Antonio Mesones Muro', 'Pítipo', 'Pueblo Nuevo'],
    'Lambayeque': ['Lambayeque', 'Chóchope', 'Íllimo', 'Jayanca', 'Mochumí', 'Mórrope', 'Motupe', 'Olmos', 'Pacora', 'Salas', 'San José', 'Túcume'],
  },
  'Lima': {
    'Lima': ['Lima', 'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Magdalena Vieja', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'],
    'Barranca': ['Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto'],
    'Cajatambo': ['Cajatambo', 'Copa', 'Gorgor', 'Huancapón', 'Manas'],
    'Canta': ['Canta', 'Arahuay', 'Huamantanga', 'Huaros', 'Lachaqui', 'San Buenaventura', 'Santa Rosa de Quives'],
    'Cañete': ['San Vicente de Cañete', 'Asia', 'Calango', 'Cerro Azul', 'Chilca', 'Coayllo', 'Imperial', 'Lunahuaná', 'Mala', 'Nuevo Imperial', 'Pacarán', 'Quilmaná', 'San Antonio', 'San Luis', 'Santa Cruz de Flores', 'Zúñiga'],
    'Huaral': ['Huaral', 'Atavillos Alto', 'Atavillos Bajo', 'Aucallama', 'Chancay', 'Ihuarí', 'Lampián', 'Pacaraos', 'San Miguel de Acos', 'Santa Cruz de Andamarca', 'Sumbilca', 'Veintisiete de Noviembre'],
    'Huarochirí': ['Matucana', 'Antioquia', 'Callahuanca', 'Carampoma', 'Chicla', 'Cuenca', 'Huachupampa', 'Huanza', 'Huarochirí', 'Jete', 'Lahuaytambo', 'Langa', 'Laraos', 'Mariatana', 'Ricardo Palma', 'San Andrés de Tupicocha', 'San Antonio', 'San Damián', 'San Juan de Iris', 'San Juan de Tantaranche', 'San Lorenzo de Quinti', 'San Mateo', 'San Mateo de Otao', 'San Pedro de Casta', 'San Pedro de Huancayre', 'Sangallaya', 'Santa Cruz de Cocachacra', 'Santa Eulalia', 'Santiago de Anchucaya', 'Santiago de Tuna', 'Santo Domingo de Los Olleros', 'Surco'],
    'Huaura': ['Huacho', 'Ambar', 'Caleta de Carquín', 'Checras', 'Hualmay', 'Huaura', 'Leoncio Prado', 'Paccho', 'Santa Leonor', 'Santa María', 'Sayan', 'Vegueta'],
    'Oyón': ['Oyón', 'Andajes', 'Caujul', 'Cochamarca', 'Navan', 'Pachangara'],
    'Yauyos': ['Yauyos', 'Alis', 'Allauca', 'Ayauca', 'Ayaviri', 'Azángaro', 'Cacra', 'Carania', 'Catahuasi', 'Chocos', 'Cochas', 'Colonia', 'Hongos', 'Huampará', 'Huancaya', 'Huangáscar', 'Huantán', 'Huañec', 'Laraos', 'Lincha', 'Madeán', 'Miraflores', 'Omas', 'Putinza', 'Quinches', 'Quinocay', 'San Joaquín', 'San Pedro de Pilas', 'Tanta', 'Tauripampa', 'Tomas', 'Tupe', 'Viñac', 'Vitis'],
  },
  'Loreto': {
    'Maynas': ['Iquitos', 'Alto Nanay', 'Fernando Lores', 'Indiana', 'Las Amazonas', 'Mazan', 'Napo', 'Punchana', 'Torres Causana', 'Belén', 'San Juan Bautista'],
    'Alto Amazonas': ['Yurimaguas', 'Balsapuerto', 'Jeberos', 'Lagunas', 'Santa Cruz', 'Teniente César López Rojas'],
    'Loreto': ['Nauta', 'Parinari', 'Tigre', 'Trompeteros', 'Urarinas'],
    'Mariscal Ramón Castilla': ['Ramón Castilla', 'Pebas', 'Yavari', 'San Pablo'],
    'Requena': ['Requena', 'Alto Tapiche', 'Capelo', 'Emilio San Martín', 'Maquia', 'Puinahua', 'Saquena', 'Soplin', 'Tapiche', 'Jenaro Herrera', 'Yaquerana'],
    'Ucayali': ['Contamana', 'Inahuaya', 'Padre Márquez', 'Pampa Hermosa', 'Sarayacu', 'Vargas Guerra'],
    'Datem del Marañón': ['Barranca', 'Cahuapanas', 'Manseriche', 'Morona', 'Pastaza', 'Andoas'],
    'Putumayo': ['Putumayo', 'Rosa Panduro', 'Teniente Manuel Clavero', 'Yaguas'],
  },
  'Madre de Dios': {
    'Tambopata': ['Tambopata', 'Inambari', 'Las Piedras', 'Laberinto'],
    'Manu': ['Manu', 'Fitzcarrald', 'Madre de Dios', 'Huepetuhe'],
    'Tahuamanu': ['Iñapari', 'Iberia', 'Tahuamanu'],
  },
  'Moquegua': {
    'Mariscal Nieto': ['Moquegua', 'Carumas', 'Cuchumbaya', 'Samegua', 'San Cristóbal', 'Torata'],
    'General Sánchez Cerro': ['Omate', 'Chojata', 'Coalaque', 'Ichuña', 'La Capilla', 'Lloque', 'Matalaque', 'Puquina', 'Quinistaquillas', 'Ubinas', 'Yunga'],
    'Ilo': ['Ilo', 'El Algarrobal', 'Pacocha'],
  },
  'Pasco': {
    'Pasco': ['Chaupimarca', 'Huachón', 'Huariaca', 'Huayllay', 'Ninacaca', 'Pallanchacra', 'Paucartambo', 'San Francisco de Asís de Yarusyacán', 'Simón Bolívar', 'Ticlacayán', 'Tinyahuarco', 'Vicco', 'Yanacancha'],
    'Daniel Alcides Carrión': ['Yanahuanca', 'Chacayan', 'Goyllarisquizga', 'Paucar', 'San Pedro de Pillao', 'Santa Ana de Tusi', 'Tapuc', 'Vilcabamba'],
    'Oxapampa': ['Oxapampa', 'Chontabamba', 'Huancabamba', 'Palcazú', 'Pozuzo', 'Puerto Bermúdez', 'Villa Rica', 'Constitución'],
  },
  'Piura': {
    'Piura': ['Piura', 'Castilla', 'Catacaos', 'Cura Mori', 'El Tallán', 'La Arena', 'La Unión', 'Las Lomas', 'Tambogrande', 'Veintiseis de Octubre'],
    'Sullana': ['Sullana', 'Bellavista', 'Ignacio Escudero', 'Lancones', 'Marcavelica', 'Miguel Checa', 'Querecotillo', 'Salitral'],
    'Talara': ['Pariñas', 'El Alto', 'La Brea', 'Lobitos', 'Los Órganos', 'Mancora'],
    'Paita': ['Paita', 'Amotape', 'Arenal', 'Colan', 'La Huaca', 'Tamarindo', 'Vichayal'],
    'Ayabaca': ['Ayabaca', 'Frias', 'Jilili', 'Lagunas', 'Montero', 'Pacaipampa', 'Paimas', 'Sapillica', 'Sicchez', 'Suyo'],
    'Huancabamba': ['Huancabamba', 'Canchaque', 'El Carmen de la Frontera', 'Huarmaca', 'Lalaquiz', 'San Miguel de El Faique', 'Sondor', 'Sondorillo'],
    'Morropón': ['Chulucanas', 'Buenos Aires', 'Chalaco', 'La Matanza', 'Morropón', 'Salitral', 'San Juan de Bigote', 'Santa Catalina de Mossa', 'Santo Domingo', 'Yamango'],
    'Sechura': ['Sechura', 'Bellavista de la Unión', 'Bernal', 'Cristo Nos Valga', 'Vice', 'Rinconada Llicuar'],
  },
  'Puno': {
    'Puno': ['Puno', 'Acora', 'Amantaní', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata', 'Mañazo', 'Paucarcolla', 'Pichacani', 'Platería', 'San Antonio', 'Tiquillaca', 'Vilque'],
    'Azángaro': ['Azángaro', 'Achaya', 'Arapa', 'Asillo', 'Caminaca', 'Chupa', 'José Domingo Choquehuanca', 'Muñani', 'Potoni', 'Saman', 'San Antón', 'San José', 'San Juan de Salinas', 'Santiago de Pupuja', 'Tirapata'],
    'Carabaya': ['Macusani', 'Ajoyani', 'Ayapata', 'Coasa', 'Corani', 'Crucero', 'Ituata', 'Ollachea', 'San Gabán', 'Usicayos'],
    'Chucuito': ['Juli', 'Desaguadero', 'Huacullani', 'Kelluyo', 'Pisacoma', 'Pomata', 'Zepita'],
    'El Collao': ['Ilave', 'Capazo', 'Pilcuyo', 'Santa Rosa', 'Conduriri'],
    'Huancané': ['Huancané', 'Cojata', 'Huatasani', 'Inchupalla', 'Pusi', 'Rosaspata', 'Taraco', 'Vilque Chico'],
    'Lampa': ['Lampa', 'Cabanilla', 'Calapuja', 'Nicasio', 'Ocuviri', 'Palca', 'Paratía', 'Pucará', 'Santa Lucía', 'Vilavila'],
    'Melgar': ['Ayaviri', 'Antauta', 'Cupi', 'Llalli', 'Macari', 'Nuñoa', 'Orurillo', 'Santa Rosa', 'Umachiri'],
    'Moho': ['Moho', 'Conima', 'Huayrapata', 'Tilali'],
    'San Antonio de Putina': ['Putina', 'Ananea', 'Pedro Vilca Apaza', 'Quilcapuncu', 'Sina'],
    'San Román': ['Juliaca', 'Cabana', 'Cabanillas', 'Caracoto', 'San Miguel'],
    'Sandia': ['Sandia', 'Alto Inambari', 'Cuyocuyo', 'Limbani', 'Patambuco', 'Phara', 'Quiaca', 'San Juan del Oro', 'Yanahuaya', 'Carabaya'],
    'Yunguyo': ['Yunguyo', 'Anapia', 'Copani', 'Cuturapi', 'Ollaraya', 'Tinicachi', 'Unicachi'],
  },
  'San Martín': {
    'Moyobamba': ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio', 'Soritor', 'Yantalo'],
    'Rioja': ['Rioja', 'Awajun', 'Elías Soplin Vargas', 'Nueva Cajamarca', 'Pardo Miguel', 'Posic', 'San Fernando', 'Yorongos', 'Yuracyacu'],
    'San Martín': ['Tarapoto', 'Alberto Leveau', 'Cacatachi', 'Chazuta', 'Chipurana', 'El Porvenir', 'Huimbayoc', 'Juan Guerra', 'La Banda de Shilcayo', 'Morales', 'Papaplaya', 'San Antonio', 'Sauce', 'Shapaja'],
    'Lamas': ['Lamas', 'Alonso de Alvarado', 'Barranquita', 'Caynarachi', 'Cuñumbuque', 'Pinto Recodo', 'Rumisapa', 'San Roque de Cumbaza', 'Shanao', 'Shatoja', 'Tabalosos', 'Zapatero'],
    'Bellavista': ['Bellavista', 'Alto Biavo', 'Bajo Biavo', 'Huallaga', 'San Pablo', 'Tingo de Ponaza'],
    'El Dorado': ['San José de Sisa', 'Agua Blanca', 'San Martín', 'Santa Rosa', 'Shatoja'],
    'Huallaga': ['Saposoa', 'Alto Saposoa', 'El Eslabón', 'Piscoyacu', 'Sacanche', 'Tingo de Saposoa'],
    'Mariscal Cáceres': ['Juanjuí', 'Campanilla', 'Huicungo', 'Pachiza', 'Pajarillo'],
    'Picota': ['Picota', 'Buenos Aires', 'Caspizapa', 'Caspisapa', 'Pilluana', 'Pucacaca', 'San Cristóbal', 'San Hilarión', 'Shamboyacu', 'Tingo de Ponaza', 'Tres Unidos'],
    'Tocache': ['Tocache', 'Nuevo Progreso', 'Pólvora', 'Shunte', 'Uchiza'],
  },
  'Tacna': {
    'Tacna': ['Tacna', 'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Inclán', 'Pachia', 'Palca', 'Pocollay', 'Sama', 'Coronel Gregorio Albarracín Lanchipa'],
    'Candarave': ['Candarave', 'Cairani', 'Camilaca', 'Curibaya', 'Huanuara', 'Quilahuani'],
    'Jorge Basadre': ['Locumba', 'Ilabaya', 'Ite'],
    'Tarata': ['Tarata', 'Estique', 'Estique-Pampa', 'Sitajara', 'Susapaya', 'Tarucachi', 'Ticaco'],
  },
  'Tumbes': {
    'Tumbes': ['Tumbes', 'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen'],
    'Contralmirante Villar': ['Zorritos', 'Casitas', 'Canoas de Punta Sal'],
    'Zarumilla': ['Zarumilla', 'Aguas Verdes', 'Matapalo', 'Papayal'],
  },
  'Ucayali': {
    'Coronel Portillo': ['Callería', 'Campoverde', 'Iparía', 'Masisea', 'Yarinacocha', 'Nueva Requena', 'Manantay'],
    'Atalaya': ['Raymondi', 'Sepahua', 'Tahuania', 'Yurúa'],
    'Padre Abad': ['Padre Abad', 'Irazola', 'Curimaná', 'Neshuya', 'Alexander Von Humboldt'],
    'Purús': ['Purús'],
  },
};

export function buscarDepartamentos(query: string): string[] {
  if (!query) return DEPARTAMENTOS;
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return DEPARTAMENTOS.filter((d) =>
    d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
  );
}

export function buscarProvincias(departamento: string, query: string): string[] {
  const lista = PROVINCIAS[departamento] ?? [];
  if (!query) return lista;
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return lista.filter((p) =>
    p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
  );
}

export function buscarDistritos(departamento: string, provincia: string, query: string): string[] {
  const lista = DISTRITOS[departamento]?.[provincia] ?? [];
  if (!query) return lista;
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return lista.filter((d) =>
    d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
  );
}
