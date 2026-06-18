package com.almostblue

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Expose la demande directe d'exemption d'optimisation batterie.
 *
 * Contrairement à l'ouverture de la liste des réglages, l'intent
 * ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS affiche une vraie boîte de
 * dialogue système « Autoriser / Refuser » pour cette app précise — l'analogue
 * d'une permission runtime (caméra, etc.). Nécessaire pour que le digest parte
 * à l'heure pile même en Doze.
 */
class BatteryOptimizationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BatteryOptimization"

  /** true si l'app est déjà exemptée d'optimisation batterie. */
  @ReactMethod
  fun isIgnoring(promise: Promise) {
    val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
  }

  /** Affiche la popup système de demande d'exemption. */
  @ReactMethod
  fun requestIgnore(promise: Promise) {
    try {
      val intent =
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:${reactApplicationContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("battery_optimization_request_failed", e)
    }
  }
}
