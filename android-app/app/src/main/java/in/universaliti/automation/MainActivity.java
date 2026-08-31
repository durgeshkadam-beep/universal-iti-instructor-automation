package in.universaliti.automation;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends Activity {
    private static final String APP_URL =
            "https://durgeshkadam-beep.github.io/universal-iti-instructor-automation/final/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openApp();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openApp();
    }

    private void openApp() {
        Uri uri = Uri.parse(APP_URL);

        try {
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setShowTitle(false)
                    .setUrlBarHidingEnabled(true)
                    .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                    .build();
            customTabsIntent.intent.setPackage("com.android.chrome");
            customTabsIntent.launchUrl(this, uri);
        } catch (ActivityNotFoundException chromeMissing) {
            try {
                CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                        .setShowTitle(false)
                        .setUrlBarHidingEnabled(true)
                        .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                        .build();
                customTabsIntent.launchUrl(this, uri);
            } catch (Exception customTabsUnavailable) {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            }
        }
    }
}
