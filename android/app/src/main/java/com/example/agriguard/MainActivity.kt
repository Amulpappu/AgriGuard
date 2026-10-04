package com.example.agriguard

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var webView: WebView? = null

    // File picker launcher for crop image uploads
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK && result.data != null) {
                val dataUri = result.data?.data
                val clipData = result.data?.clipData
                if (clipData != null) {
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                } else if (dataUri != null) {
                    arrayOf(dataUri)
                } else null
            } else null

            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (!isGranted) {
            Toast.makeText(this, "Camera permission recommended for scanning crops", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }

        setContent {
            AgriGuardMobileApp(
                onAttachWebView = { wv -> webView = wv },
                onOpenFileChooser = { callback, fileChooserParams ->
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = callback
                    try {
                        val intent = fileChooserParams.createIntent()
                        fileChooserLauncher.launch(intent)
                        true
                    } catch (e: Exception) {
                        filePathCallback = null
                        false
                    }
                }
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView?.canGoBack() == true) {
            webView?.goBack()
        } else {
            super.onBackPressed()
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgriGuardMobileApp(
    onAttachWebView: (WebView) -> Unit,
    onOpenFileChooser: (ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams) -> Boolean
) {
    val context = LocalContext.current
    val sharedPrefs = remember { context.getSharedPreferences("agriguard_prefs", Activity.MODE_PRIVATE) }
    
    // Default to Type-C USB (http://localhost:3000), Wi-Fi (192.168.0.3:3000), or Tunnel
    var currentUrl by remember {
        mutableStateOf(sharedPrefs.getString("server_url", "http://localhost:3000") ?: "http://localhost:3000")
    }
    var inputUrl by remember { mutableStateOf(currentUrl) }
    var showSettings by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var activeWebView by remember { mutableStateOf<WebView?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF030712) // Dark AgriGuard background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Optional top settings header
            if (showSettings) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "AgriGuard Server Connection",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF22C55E)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = inputUrl,
                            onValueChange = { inputUrl = it },
                            label = { Text("Server URL", color = Color.Gray) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF22C55E),
                                unfocusedBorderColor = Color.DarkGray
                            ),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = {
                                currentUrl = inputUrl
                                sharedPrefs.edit().putString("server_url", inputUrl).apply()
                                activeWebView?.loadUrl(inputUrl)
                                showSettings = false
                            })
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Button(
                                onClick = {
                                    currentUrl = "http://localhost:3000"
                                    inputUrl = currentUrl
                                    sharedPrefs.edit().putString("server_url", currentUrl).apply()
                                    activeWebView?.loadUrl(currentUrl)
                                    showSettings = false
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF047857)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Type-C USB", fontSize = 11.sp, color = Color.White)
                            }
                            Button(
                                onClick = {
                                    currentUrl = "http://192.168.0.3:3000"
                                    inputUrl = currentUrl
                                    sharedPrefs.edit().putString("server_url", currentUrl).apply()
                                    activeWebView?.loadUrl(currentUrl)
                                    showSettings = false
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Wi-Fi IP", fontSize = 11.sp, color = Color.White)
                            }
                            Button(
                                onClick = {
                                    currentUrl = inputUrl
                                    sharedPrefs.edit().putString("server_url", inputUrl).apply()
                                    activeWebView?.loadUrl(inputUrl)
                                    showSettings = false
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Connect", fontSize = 11.sp, color = Color.White)
                            }
                        }
                    }
                }
            }

            // Minimal Toolbar with quick reconnect & toggle settings
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp)
                    .background(Color(0xFF0B132B))
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "🌱 AgriGuard Mobile",
                    color = Color(0xFF4ADE80),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { activeWebView?.reload() },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Text("↻", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(
                        onClick = { showSettings = !showSettings },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Text("⚙", color = if (showSettings) Color(0xFF22C55E) else Color.White, fontSize = 16.sp)
                    }
                }
            }

            // WebView Container
            Box(modifier = Modifier.fillMaxSize()) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            settings.apply {
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                databaseEnabled = true
                                useWideViewPort = true
                                loadWithOverviewMode = true
                                setSupportZoom(true)
                                builtInZoomControls = false
                                allowFileAccess = true
                                allowContentAccess = true
                                mediaPlaybackRequiresUserGesture = false
                            }

                            webViewClient = object : WebViewClient() {
                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                    isLoading = true
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    isLoading = false
                                }

                                override fun onReceivedError(
                                    view: WebView?,
                                    errorCode: Int,
                                    description: String?,
                                    failingUrl: String?
                                ) {
                                    isLoading = false
                                }
                            }

                            webChromeClient = object : WebChromeClient() {
                                override fun onShowFileChooser(
                                    webView: WebView?,
                                    filePathCallback: ValueCallback<Array<Uri>>?,
                                    fileChooserParams: FileChooserParams?
                                ): Boolean {
                                    if (filePathCallback != null && fileChooserParams != null) {
                                        return onOpenFileChooser(filePathCallback, fileChooserParams)
                                    }
                                    return false
                                }
                            }

                            loadUrl(currentUrl)
                            activeWebView = this
                            onAttachWebView(this)
                        }
                    },
                    update = { view ->
                        activeWebView = view
                    }
                )

                if (isLoading) {
                    LinearProgressIndicator(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopCenter),
                        color = Color(0xFF22C55E),
                        trackColor = Color.Transparent
                    )
                }
            }
        }
    }
}
