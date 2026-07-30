// Genere CLQ App Factory v2026.07.26-culture-city-bound
const locations=[
    { name: "Palazzo Santa Chiara et MuMaT", lat: 38.679991, lng: 15.898514, audio: "audio/Palazzo_Santa_Chiara_et_MuMaT.mp3", image: "images/points interets/tropea-palazzo-santa-chiara.jpg", fallbackImage: "images/points interets/Palazzo_Santa_Chiara_et_MuMaT.svg" },
    { name: "Chiesa di San Francesco d’Assisi", lat: 38.680207, lng: 15.899273, audio: "audio/Chiesa_di_San_Francesco_d_Assisi.mp3", image: "images/points interets/tropea-san-francesco.jpg", fallbackImage: "images/points interets/Chiesa_di_San_Francesco_d_Assisi.svg" },
    { name: "Chiesa del Gesù", lat: 38.679495, lng: 15.899192, audio: "audio/Chiesa_del_Gesu.mp3", image: "images/points interets/tropea-chiesa-gesu.jpg", fallbackImage: "images/points interets/Chiesa_del_Gesu.svg" },
    { name: "Concattedrale Maria Santissima di Romania", lat: 38.678098, lng: 15.898579, audio: "audio/Concattedrale_Maria_Santissima_di_Romania.mp3", image: "images/points interets/tropea-concattedrale.jpg", fallbackImage: "images/points interets/Concattedrale_Maria_Santissima_di_Romania.svg" },
    { name: "Piazza Ercole", lat: 38.678435, lng: 15.897536, audio: "audio/Piazza_Ercole.mp3", image: "images/points interets/tropea-piazza-ercole.jpg", fallbackImage: "images/points interets/Piazza_Ercole.svg" },
    { name: "Palazzo Giffone", lat: 38.678375, lng: 15.897086, audio: "audio/Palazzo_Giffone.mp3", image: "images/points interets/tropea-palazzo-giffone.jpg", fallbackImage: "images/points interets/Palazzo_Giffone.svg" },
    { name: "Corso Vittorio Emanuele", lat: 38.678232, lng: 15.896935, audio: "audio/Corso_Vittorio_Emanuele.mp3", image: "images/points interets/tropea-corso-vittorio-emanuele.jpg", fallbackImage: "images/points interets/Corso_Vittorio_Emanuele.svg" },
    { name: "Affaccio dei Sospiri", lat: 38.678006, lng: 15.896143, audio: "audio/Affaccio_dei_Sospiri.mp3", image: "images/points interets/tropea-affaccio-sospiri.jpg", fallbackImage: "images/points interets/Affaccio_dei_Sospiri.svg" },
    { name: "Spiaggia della Rotonda et Grotta del Palombaro", lat: 38.679126, lng: 15.895055, audio: "audio/Spiaggia_della_Rotonda_et_Grotta_del_Palombaro.mp3", image: "images/points interets/tropea-rotonda-palombaro.jpg", fallbackImage: "images/points interets/Spiaggia_della_Rotonda_et_Grotta_del_Palombaro.svg" },
    { name: "Santuario di Santa Maria dell’Isola", lat: 38.67992, lng: 15.89547, audio: "audio/Santuario_di_Santa_Maria_dell_Isola.mp3", image: "images/points interets/tropea-santa-maria-isola.jpg", fallbackImage: "images/points interets/Santuario_di_Santa_Maria_dell_Isola.svg" }
];
const availableCircuits=["petit"];
const circuits={"petit":[1,2,3,4,5,6,7,8,9,10,1],"petit_gare":[1,2,3,4,5,6,7,8,9,10,1]};
const circuitEstimates={"petit":{"distanceKm":1.4,"walkingTimeMinutes":18,"listeningTimeMinutes":70,"totalTimeMinutes":88}};
