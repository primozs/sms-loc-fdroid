<script lang="ts" setup>
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  useIonRouter,
} from '@ionic/vue';
import { arrowForwardOutline } from 'ionicons/icons';
import { useSwiper } from '@/components/useSwiper';
import { usePresentation } from './usePresentation';
import { usePermissions } from '@/services/usePermissions';

const { elementRef, nextClick, bulletClick } = useSwiper();
const ionRouter = useIonRouter();
const presentation = usePresentation();
const { checkLocationAndPermissions } = usePermissions();

const handlePageClickNext = () => {
  nextClick();
};
const handleContinue = async () => {
  await presentation.setPresentationViewed(true);
  ionRouter.navigate('/contacts/list', 'forward', 'push');
  checkLocationAndPermissions();

  setTimeout(() => {
    bulletClick(0);
  }, 1000);
};
</script>

<template>
  <IonPage>
    <IonContent
      :fullscreen="true"
      :scroll-y="false"
      class="ion-padding"
      color="light"
    >
      <div
        ref="elementRef"
        class="swiper hover:delay-1000"
        @click="handlePageClickNext"
      >
        <div class="swiper-wrapper relative">
          <div class="swiper-slide">
            <img
              src="/assets/icons/android-chrome-512x512.png"
              width="512"
              height="512"
            />
            <h2>Offline</h2>
            <p>
              Locate your friend and be found via <b>SMS</b> in areas with
              <b>no internet or poor internet connectivity</b>.
            </p>

            <p>
              SMSLoc can be used offline by whitelisted friends to check each
              other's exact location at any time.
            </p>
            <p>
              It is designed for outdoor use when hiking, climbing, canyoning,
              paragliding etc.
            </p>
          </div>
          <div class="swiper-slide">
            <img
              src="/assets/icons/android-chrome-512x512.png"
              width="512"
              height="512"
            />
            <h2>Need help!</h2>
            <p>
              Send short, predefined messages <b>along with your location</b>.
            </p>

            <p>
              SMSLoc requires SMS and background location permission so that it
              can always respond hands-free to an SMS request with the exact
              location while the user is engaged in their outdoor activity or
              being in distress.
            </p>

            <!-- <IonButton fill="clear" @click="handleContinue()">
              Continue
              <IonIcon slot="end" :icon="arrowForwardOutline" />
            </IonButton> -->
          </div>

          <div
            class="swiper-slide overflow-y-auto max-h-[90%] !text-left [&>p]:!p-0"
          >
            <h2>Privacy Policy</h2>
            <p class="text-sm absolute top-0 right-0">(Scroll to continue)</p>
            <p>
              No user data is collected, stored by the developer (stenar, pgc
              d.o.o.) or shared or sold to any third parties outside of the
              user's phone.
            </p>

            <p>
              SMSLoc does not contain advertising and does not use user location
              for advertising or analytics.
            </p>

            <h3>Location data</h3>

            <p>
              Location is only shared with another phone if that phone number is
              approved (whitelisted) by the user in SMSLoc. All location
              requests are made manually via SMS and are seen by the phone
              owner.
            </p>

            <p>
              The SMSLoc application is designed to be used outdoors with poor
              or no internet connectivity when not actively using the
              application. Therefore, SMSLoc requires background location
              permission so that it can always respond hands-free to an SMS
              request with the exact location while the user is engaged in their
              outdoor activity or being in distress.
            </p>

            <h3>SMS data</h3>

            <p>
              To be able to work offline without internet even with poor phone
              signal in the mountains, deep valleys or canyons. SMSLoc uses
              short SMS messages to communicate between whitelisted phones. It
              is basically a user interface to send exactly the same information
              manually by the user with the added help of a hands-free automatic
              response when/if the user is unable to respond manually.
            </p>

            <h4>Types of SMS messages that SMSLoc listens to or replies to:</h4>

            <ul>
              <li>"Loc?"</li>
              <li>"Loc:lat,lon,alt,time,speed,battery,message"</li>
            </ul>

            <div class="flex justify-center m-4">
              <IonButton fill="clear" @click="handleContinue()">
                Continue
                <IonIcon slot="end" :icon="arrowForwardOutline" />
              </IonButton>
            </div>
          </div>
        </div>

        <div class="swiper-pagination"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.swiper {
  height: 100%;
}

.swiper-slide {
  display: block;
  text-align: center;
}

.swiper-slide h2 {
  margin-top: 2.8rem;
  margin-bottom: 1.2rem;
}

.swiper-slide img {
  max-height: 40%;
  max-width: 65%;
  margin: 60px auto 40px;
  pointer-events: none;
}

b {
  font-weight: 500;
}

p {
  padding: 0 40px;
  font-size: 17px;
  line-height: 1.5;
  color: var(--ion-color-step-600, #60646b);
  text-wrap: balance;
  margin-bottom: 10px;
}

p b {
  color: var(--ion-text-color, #000000);
}
</style>
