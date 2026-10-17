import os
import urllib.request
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRATCH_DIR = os.path.dirname(BASE_DIR)
DEST_DIRS = [
    os.path.join(SCRATCH_DIR, "frontend", "public", "images", "cars"),
    os.path.join(SCRATCH_DIR, "frontend", "images", "cars"),
    os.path.join(SCRATCH_DIR, "frontend", "public", "images", "details"),
    os.path.join(SCRATCH_DIR, "frontend", "images", "details")
]

for d in DEST_DIRS:
    os.makedirs(d, exist_ok=True)

# Direct verified CDN image URLs (High quality real catalog photos)
CDN_MAP = {
    # MPV
    "toyota_avanza.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/2022_Toyota_Avanza_1.5_G_Toyota_Safety_Sense_W101RE_%2820220403%29.jpg/960px-2022_Toyota_Avanza_1.5_G_Toyota_Safety_Sense_W101RE_%2820220403%29.jpg",
    "mitsubishi_xpander.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/2018_Mitsubishi_Xpander_Ultimate_1.5_NC1W_%2820190623%29.jpg/960px-2018_Mitsubishi_Xpander_Ultimate_1.5_NC1W_%2820190623%29.jpg",
    "toyota_innova.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Toyota_Innova_Zenix_2.0_V_%28III%29_%E2%80%93_f_22032025.jpg/960px-Toyota_Innova_Zenix_2.0_V_%28III%29_%E2%80%93_f_22032025.jpg",
    "suzuki_ertiga.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Suzuki_Ertiga_NC_FL_1.5_GLX_Hybrid_Snow_White_Pearl.jpg/960px-Suzuki_Ertiga_NC_FL_1.5_GLX_Hybrid_Snow_White_Pearl.jpg",
    "daihatsu_xenia.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/2022_Daihatsu_Xenia_1.3_R_W100RG_%2820220506%29.jpg/960px-2022_Daihatsu_Xenia_1.3_R_W100RG_%2820220506%29.jpg",
    "toyota_calya.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/2018_Daihatsu_Sigra_1.0_D_wagon_%28B400RS%3B_01-12-2019%29%2C_South_Tangerang.jpg/960px-2018_Daihatsu_Sigra_1.0_D_wagon_%28B400RS%3B_01-12-2019%29%2C_South_Tangerang.jpg",
    "daihatsu_sigra.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/2018_Daihatsu_Sigra_1.0_D_wagon_%28B400RS%3B_01-12-2019%29%2C_South_Tangerang.jpg/960px-2018_Daihatsu_Sigra_1.0_D_wagon_%28B400RS%3B_01-12-2019%29%2C_South_Tangerang.jpg",
    "honda_mobilio.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Honda_Mobilio.jpg/960px-Honda_Mobilio.jpg",
    "toyota_sienta.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Toyota_Sienta_XP80_Light_Yellow_%281%29.jpg/960px-Toyota_Sienta_XP80_Light_Yellow_%281%29.jpg",
    "wuling_confero.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Wuling_Cortez_%28front%29%2C_Denpasar.jpg/960px-Wuling_Cortez_%28front%29%2C_Denpasar.jpg",
    "wuling_cortez.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Wuling_Cortez_%28front%29%2C_Denpasar.jpg/960px-Wuling_Cortez_%28front%29%2C_Denpasar.jpg",
    "hyundai_stargazer.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Hyundai_Stargazer_X_KS_Cartenz_1.5_Premium_Creamy_White_Pearl_with_Black_roof.jpg/960px-Hyundai_Stargazer_X_KS_Cartenz_1.5_Premium_Creamy_White_Pearl_with_Black_roof.jpg",
    "nissan_grand_livina.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/2012_Nissan_Grand_Livina_1.5_Ultimate_L10_%2820190623%29.jpg/960px-2012_Nissan_Grand_Livina_1.5_Ultimate_L10_%2820190623%29.jpg",
    "nissan_serena.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Nissan_Serena_C28_e-Power_Highway_Star_V.jpg/960px-Nissan_Serena_C28_e-Power_Highway_Star_V.jpg",

    # Hatchback & City Cars
    "honda_brio.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Honda_Brio_DD1_FL_1.2_V_Rallye_Red.jpg/960px-Honda_Brio_DD1_FL_1.2_V_Rallye_Red.jpg",
    "daihatsu_ayla.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/2014_Daihatsu_Ayla_1.0_X_B100RS_%2820190615%29.jpg/960px-2014_Daihatsu_Ayla_1.0_X_B100RS_%2820190615%29.jpg",
    "toyota_agya.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/2014_Daihatsu_Ayla_1.0_X_B100RS_%2820190615%29.jpg/960px-2014_Daihatsu_Ayla_1.0_X_B100RS_%2820190615%29.jpg",
    "toyota_yaris.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg/960px-2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg",
    "honda_jazz.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/1985_Honda_Jazz_1.2_Luxe_Hondamatic_%2816325497345%29.jpg/960px-1985_Honda_Jazz_1.2_Luxe_Hondamatic_%2816325497345%29.jpg",
    "suzuki_ignis.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/2018_Suzuki_Ignis_SZ5_SHVS_Allgrip_1.2_Front.jpg/960px-2018_Suzuki_Ignis_SZ5_SHVS_Allgrip_1.2_Front.jpg",
    "suzuki_baleno.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Suzuki_Baleno_front_20071004.jpg/960px-Suzuki_Baleno_front_20071004.jpg",
    "suzuki_spresso.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Suzuki_S-Presso_%E2%80%93_Dubai_%28cropped%29.jpg/960px-Suzuki_S-Presso_%E2%80%93_Dubai_%28cropped%29.jpg",
    "mazda_2.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/2015_Mazda2_%28DJ%29_Genki_hatchback_%282018-08-27%29_01.jpg/960px-2015_Mazda2_%28DJ%29_Genki_hatchback_%282018-08-27%29_01.jpg",

    # SUV & Crossover
    "honda_hrv.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/2023_Honda_HR-V_Advance_i-MMD_CVT_1.5.jpg/960px-2023_Honda_HR-V_Advance_i-MMD_CVT_1.5.jpg",
    "mitsubishi_pajero.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Mitsubishi_Pajero_Sport_%283rd_generation%29_1X7A0409.jpg/960px-Mitsubishi_Pajero_Sport_%283rd_generation%29_1X7A0409.jpg",
    "toyota_fortuner.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/2015_Toyota_Fortuner_%28New_Zealand%29.jpg/960px-2015_Toyota_Fortuner_%28New_Zealand%29.jpg",
    "toyota_rush.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/2018_Daihatsu_Terios_1.5_R_Deluxe_wagon_%28F800RG%3B_01-12-2019%29%2C_South_Tangerang.jpg/960px-2018_Daihatsu_Terios_1.5_R_Deluxe_wagon_%28F800RG%3B_01-12-2019%29%2C_South_Tangerang.jpg",
    "daihatsu_terios.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/2018_Daihatsu_Terios_1.5_R_Deluxe_wagon_%28F800RG%3B_01-12-2019%29%2C_South_Tangerang.jpg/960px-2018_Daihatsu_Terios_1.5_R_Deluxe_wagon_%28F800RG%3B_01-12-2019%29%2C_South_Tangerang.jpg",
    "honda_crv.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Honda_CR-V_e-HEV_Elegance_AWD_%28VI%29_%E2%80%93_f_14072024.jpg/960px-Honda_CR-V_e-HEV_Elegance_AWD_%28VI%29_%E2%80%93_f_14072024.jpg",
    "honda_brv.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/2022_Honda_BR-V_Prestige_with_Honda_Sensing_1.5_DG3_%2820220429%29.jpg/960px-2022_Honda_BR-V_Prestige_with_Honda_Sensing_1.5_DG3_%2820220429%29.jpg",
    "toyota_raize.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/1989_Daihatsu_Rocky_2.0_DX_Wagon.jpg/960px-1989_Daihatsu_Rocky_2.0_DX_Wagon.jpg",
    "wuling_almaz.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/2019_Wuling_Almaz_1.5_%2820190616%29.jpg/960px-2019_Wuling_Almaz_1.5_%2820190616%29.jpg",
    "hyundai_creta.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/2024_Hyundai_Creta_1.5_MPi_SX%28O%29_%28India%29_front_view.png/960px-2024_Hyundai_Creta_1.5_MPi_SX%28O%29_%28India%29_front_view.png",
    "mazda_cx5.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/2024_Mazda_CX-5_2.5_S_Select_in_Platinum_Quartz_Metallic%2C_front_right.jpg/960px-2024_Mazda_CX-5_2.5_S_Select_in_Platinum_Quartz_Metallic%2C_front_right.jpg",
    "mazda_cx3.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/2017_Mazda_CX-3_Sport_NAV_Automatic_2.0_Front.jpg/960px-2017_Mazda_CX-3_Sport_NAV_Automatic_2.0_Front.jpg",
    "nissan_xtrail.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Nissan_X-Trail_%28T33%29_1X7A7179.jpg/960px-Nissan_X-Trail_%28T33%29_1X7A7179.jpg",
    "nissan_juke.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Nissan_Juke_%28F16%29_IMG_4903.jpg/960px-Nissan_Juke_%28F16%29_IMG_4903.jpg",

    # Sedan
    "honda_civic.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Honda_Civic_e-HEV_Sport_%28XI%29_%E2%80%93_f_30062024.jpg/960px-Honda_Civic_e-HEV_Sport_%28XI%29_%E2%80%93_f_30062024.jpg",
    "honda_city.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Honda_City_1.5_i-VTEC_V_%28VIII%2C_Facelift%29_%E2%80%93_f_22032025.jpg/960px-Honda_City_1.5_i-VTEC_V_%28VIII%2C_Facelift%29_%E2%80%93_f_22032025.jpg",
    "bmw_3.jpg": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/BMW_G20_%282022%29_IMG_7316_%282%29.jpg/960px-BMW_G20_%282022%29_IMG_7316_%282%29.jpg"
}

headers = {'User-Agent': 'Mozilla/5.0'}

success = 0
for filename, url in CDN_MAP.items():
    dest1 = os.path.join(SCRATCH_DIR, "frontend", "public", "images", "cars", filename)
    dest2 = os.path.join(SCRATCH_DIR, "frontend", "images", "cars", filename)

    if os.path.isfile(dest1) and os.path.getsize(dest1) > 10000:
        print(f"Already exists: {filename}")
        success += 1
        continue

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read()
            with open(dest1, "wb") as f1:
                f1.write(data)
            with open(dest2, "wb") as f2:
                f2.write(data)
            print(f"Downloaded: {filename} ({len(data)//1024} KB)")
            success += 1
    except Exception as e:
        print(f"Failed {filename}: {e}")

print(f"\nFinished: {success}/{len(CDN_MAP)} images successfully downloaded!")
