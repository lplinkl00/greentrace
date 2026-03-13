import urllib.request
import os

images = {
    "greentrace_logo_v1.png": "https://lh3.googleusercontent.com/aida/AOfcidWMAPfqS9jZMLSZxTZEmerV8kPe4XSsx3fgouxV75psxS5aB8FtwnB1Kz3P3oThdurTwxLpI50nOj7LTKk-gmg7g8Ty57OPOEtOVJoZXBpFYm3CEg6VefwZKJwKElwdF5uWWffp8kDKT1QDf54drUenpOB8f0kUubLiibfWS9ce8KopiR2-D781YcwY9xsIzEeOGnTEdDwV7yRezi-DJjHlX-qPiT8eCtuY4GjIcMPbMWDLCrOCxGN7Xnw",
    "greentrace_logo_v2.png": "https://lh3.googleusercontent.com/aida/AOfcidWJK_DQh3EEEkCePTlllKhdk3wd5I3wFCU0I6gqf9HO2mo9Kf0D9Su9aaSJpkrYDWiS1QEiPONqRuPN6or31Fzc49KtiT6nT8j5nC-wlv06GctR5PAeMkNVc_Sh-9ZpwNv3NstLJD0JYUqefJsfQyZmPT0f25WXV_7pXSv3P_rW3FfoPPs1bXMXc7gHgkgPSuGucQfhaB5L7srWHs0DvP_ahIvTXALbt621FBY4XRZh_LOeNeR1GlBMtQ"
}

os.makedirs('d:/Claude Code/docs/designs', exist_ok=True)
for name, url in images.items():
    try:
        path = os.path.join('d:/Claude Code/docs/designs', name)
        print(f"Downloading {name}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Saved {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")
