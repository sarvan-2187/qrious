import os
import json
from livekit import api
from datetime import datetime, timezone

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

def generate_room_token(room_name: str, identity: str, name: str, is_educator: bool) -> str:
    # Educators can publish everything. Students can only publish camera (video) and screen by default.
    sources = [
        "camera", 
        "microphone", 
        "screen_share", 
        "screen_share_audio"
    ] if is_educator else [
        "camera"
    ]

    metadata = json.dumps({"canSpeak": is_educator})

    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity(identity) \
        .with_name(name) \
        .with_metadata(metadata) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_publish_data=True,
            can_publish_sources=sources,
            can_subscribe=True,
        ))
    return token.to_jwt()

async def start_recording(room_name: str, b2_key: str) -> str:
    """Starts a RoomComposite egress, writing directly to B2 via S3-compatible output."""
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    
    # Ensure the room exists before trying to record it
    try:
        await lkapi.room.create_room(api.CreateRoomRequest(name=room_name, empty_timeout=10 * 60))
    except Exception as e:
        print(f"Room creation notice: {e}")

    req = api.RoomCompositeEgressRequest(
        room_name=room_name,
        file_outputs=[api.EncodedFileOutput(
            file_type=api.EncodedFileType.MP4,
            filepath=b2_key,
            s3=api.S3Upload(
                endpoint=os.getenv("B2_ENDPOINT"),
                access_key=os.getenv("B2_KEY_ID"),
                secret=os.getenv("B2_APPLICATION_KEY"),
                bucket=os.getenv("B2_BUCKET_NAME"),
                force_path_style=True,
            ),
        )],
    )
    egress_info = await lkapi.egress.start_room_composite_egress(req)
    await lkapi.aclose()
    return egress_info.egress_id

async def stop_recording(egress_id: str):
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    await lkapi.egress.stop_egress(api.StopEgressRequest(egress_id=egress_id))
    await lkapi.aclose()

async def delete_livekit_room(room_name: str):
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    try:
        await lkapi.room.delete_room(api.DeleteRoomRequest(room=room_name))
    except Exception as e:
        print(f"Failed to delete room: {e}")
    await lkapi.aclose()

async def update_participant_permissions(room_name: str, identity: str, can_publish: bool):
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    
    # In our app, update_participant_permissions specifically grants or revokes Microphone access.
    # Video (CAMERA) is always allowed.
    sources = [
        api.TrackSource.CAMERA, 
        api.TrackSource.MICROPHONE, 
        api.TrackSource.SCREEN_SHARE, 
        api.TrackSource.SCREEN_SHARE_AUDIO
    ] if can_publish else [
        api.TrackSource.CAMERA
    ]

    req = api.UpdateParticipantRequest(
        room=room_name,
        identity=identity,
        metadata=json.dumps({"canSpeak": can_publish}),
        permission=api.ParticipantPermission(
            can_publish=True,
            can_publish_data=True,
            can_subscribe=True,
            can_publish_sources=sources
        )
    )
    await lkapi.room.update_participant(req)
    await lkapi.aclose()

async def update_all_participants_permissions(room_name: str, can_publish: bool, educator_identity: str):
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    
    participants = await lkapi.room.list_participants(api.ListParticipantsRequest(room=room_name))
    
    sources = [
        api.TrackSource.CAMERA, 
        api.TrackSource.MICROPHONE, 
        api.TrackSource.SCREEN_SHARE, 
        api.TrackSource.SCREEN_SHARE_AUDIO
    ] if can_publish else [
        api.TrackSource.CAMERA
    ]
    
    for p in participants.participants:
        if p.identity == educator_identity:
            continue
            
        req = api.UpdateParticipantRequest(
            room=room_name,
            identity=p.identity,
            metadata=json.dumps({"canSpeak": can_publish}),
            permission=api.ParticipantPermission(
                can_publish=True,
                can_publish_data=True,
                can_subscribe=True,
                can_publish_sources=sources
            )
        )
        await lkapi.room.update_participant(req)
        
    await lkapi.aclose()
