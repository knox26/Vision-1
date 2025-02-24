import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import Peer from "peerjs";
import { Phone, PhoneOff } from "lucide-react";

import ChatContainer from "@/components/Chat";
import { useChatStore } from "@/store/useChatStore";

function VideoCall() {
  const { authUser, match, setMatch, socket } = useAuthStore();
  const [peer, setPeer] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const { setMessagesNull } = useChatStore();

  useEffect(() => {
    if (authUser) {
      const newPeer = new Peer(authUser._id);
      setPeer(newPeer);
      newPeer.on("open", (id) => {
        console.log("Peer ID:", id);
      });
    }
  }, [authUser]);

  useEffect(() => {
    socket.on("match-found", ({ match }) => {
      console.log("Match found", match);
      setMatch(match);
    });

    socket.on("ended-call", ({ msg }) => {
      console.log(msg);
      if (msg) {
        console.log("match set to null");
        setMatch(null);
        setMessagesNull();
        console.log(match);
      }
    });
  }, [socket, setMatch]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { codec: "VP9" }, audio: true }) // Changed: Explicitly request VP9 codec
      .then((stream) => {
        setMyStream(stream);
      })
      .catch((err) => console.error("Error accessing media devices:", err));
  }, []);

  const startCall = () => {
    socket.emit("find-match", { id: authUser._id });
  };

  const endCall = () => {
    if (match) {
      socket.emit("end-call", { to: match, msg: "ended call" });
      console.log("call ended");
      setMatch(null);
      setMessagesNull();
      console.log("match set to null");
    }
  };

  return (
    <div className={` ${match === null ? "h-[99.1vh] " : ""} `}>
      <div className="pt-16 flex justify-center md:gap-5 gap-2 items-center">
        <button
          className="px-5 py-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-700 hover:to-cyan-700"
          onClick={startCall}
          disabled={!!match}
        >
          <Phone />
        </button>
        <button
          className="px-5 py-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-700 hover:to-orange-700"
          onClick={endCall}
          disabled={!match}
        >
          <PhoneOff />
        </button>
      </div>
      <div className=" flex flex-col md:flex-row gap-2 md:gap-5 mt-5 md:mt-6 ">
        <VideoFrame peer={peer} match={match} myStream={myStream} />
        {match && (
          <div className="h-[75vh] mx-2 md:mx-0 md:w-[55vw] bg-gray-900 rounded-xl md:mt-2.5">
            <ChatContainer />
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCall;

function VideoFrame({ peer, match, myStream }) {
  const remoteVideoRef = useRef(null);
  const currentUserVideoRef = useRef(null);

  useEffect(() => {
    if (currentUserVideoRef.current && myStream) {
      currentUserVideoRef.current.srcObject = myStream;
      currentUserVideoRef.current.onloadedmetadata = () => {
        currentUserVideoRef.current
          .play()
          .catch((err) => console.error("Video play error:", err));
      };
    }
  }, [myStream]);

  // Changed: Function to prioritize VP9 in SDP
  const setCodecPreference = (sdp) => {
    return sdp.replace(
      /m=video.*\r\n/g,
      (match) => match + "a=rtpmap:98 VP9/90000\r\n"
    );
  };

  useEffect(() => {
    if (peer && match && myStream) {
      console.log("Connecting to peer:", match);
      const call = peer.call(match, myStream);

      if (call) {
        call.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current
                .play()
                .catch((err) => console.error("Remote video play error:", err));
            };
          }
        });

        // Changed: Modify SDP to use VP9
        call.on("sdp", (sdp) => {
          call.peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: "offer",
              sdp: setCodecPreference(sdp),
            })
          );
        });
      }

      peer.on("call", (incomingCall) => {
        incomingCall.answer(myStream);

        incomingCall.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current
                .play()
                .catch((err) => console.error("Remote video play error:", err));
            };
          }
        });

        // Changed: Modify SDP for incoming call to use VP9
        incomingCall.on("sdp", (sdp) => {
          incomingCall.peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: "answer",
              sdp: setCodecPreference(sdp),
            })
          );
        });
      });
    }
  }, [peer, match, myStream]);

  return (
    <div className="lg:w-[40vw] rounded-xl">
      <div className="video-container flex flex-col justify-between items-center md:gap-4 gap-2 m-2 mt-2.5 rounded-xl">
        <div className="p-1 rounded-3xl bg-gray-900">
          <video
            ref={currentUserVideoRef}
            muted
            autoPlay
            playsInline
            className="h-[35vh] aspect-[16/9] rounded-3xl"
          />
        </div>
        {match && (
          <div className="p-1 rounded-3xl bg-gray-900">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-[35vh] aspect-[16/9] rounded-3xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
