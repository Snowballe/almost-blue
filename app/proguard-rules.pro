# Règles R8 du projet — les libs (OkHttp, MapLibre, Compose, DataStore,
# WorkManager) embarquent leurs propres consumer rules.

# kotlinx.serialization : conserver les serializers générés des modèles
# (réponses Open-Meteo). Ceinture et bretelles par-dessus les règles fournies
# par la lib — le parsing JSON est le cœur de l'app, un serializer strippé
# casserait silencieusement la météo.
-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class com.almostblue.**$$serializer { *; }
-keepclassmembers class com.almostblue.** {
    *** Companion;
}
-keepclasseswithmembers class com.almostblue.** {
    kotlinx.serialization.KSerializer serializer(...);
}
