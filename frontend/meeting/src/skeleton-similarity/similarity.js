// pose1의 기준점 좌표를 받아오는 함수
// x,y,신뢰도
function extractSkeletonCoordinates(results,bodyPart) {
    const skeletonCoordinates = [];
    let indices;
    if (bodyPart === 'upperBody'){
        indices = [0,11,12,13,14,15,16,23,24];
    } else if (bodyPart === 'lowerBody'){
        indices = [23,24,25,26,27,28,29,30];
    } else{
        indices = [0,11,12,13,14,15,16,23,24,25,26,27,28,29,30];
    }
    

    if (results && results.poseLandmarks) {
        indices.forEach((index) => {
            const x = results.poseLandmarks[index].x;
            const y = results.poseLandmarks[index].y;
            const confidence = results.poseLandmarks[index].visibility;
            skeletonCoordinates.push({x, y,confidence});
        });
    }

    return skeletonCoordinates;
}

// pose2의 기준점 좌표를 받아오는 함수
// x,y,신뢰도
function extractSkeletonCoordinates2(results,bodyPart) {
    const skeletonCoordinates2 = [];
    let indices;
    if (bodyPart === 'upperBody'){
        indices = [0,11,12,13,14,15,16,23,24];
    } else if (bodyPart === 'lowerBody'){
        indices = [23,24,25,26,27,28,29,30];
    } else{
        indices = [0,11,12,13,14,15,16,23,24,25,26,27,28,29,30];
    }

    if (results && results.poseLandmarks) {
        indices.forEach((index) => {
            const x = results.poseLandmarks[index].x;
            const y = results.poseLandmarks[index].y;
            const confidence = results.poseLandmarks[index].visibility;
            skeletonCoordinates2.push({x, y,confidence});
        });
    }

    return skeletonCoordinates2;
}

// 함수: weightedDistanceMatching
/* 두 포즈(2차원 좌표벡터) 사이의 가중거리를 계산하는 함수
    점들 사이의 거리를 측정 */
function weightedDistanceMatching(vectorPose1XY, vectorPose2XY, vectorConfidences) {
    const summation1 = 1 / vectorConfidences[vectorConfidences.length - 1];
    var summation2 = 0;

    for (var i = 0; i < vectorPose1XY.length; i++) {
        var confIndex = Math.floor(i / 2);
        summation2 += vectorConfidences[confIndex] * Math.abs(vectorPose1XY[i] - vectorPose2XY[i]);
    }
    return summation1 * summation2;
}

// 함수: convertPoseToVector
/*포즈 데이터를 처리하여 2차원 벡터 형식으로 변환하고, 신뢰도를 추출하여 x,y좌표의 최소값과 최대값을 기반으로 스케일링 요소 계산 */
function convertPoseToVector(pose) {
    var vectorPoseXY = [];
    var vectorPoseConfidences = [];
    var translateX = Number.POSITIVE_INFINITY;
    var translateY = Number.POSITIVE_INFINITY;
    var scaler = Number.NEGATIVE_INFINITY;

    pose.forEach(function (point) {
        var x = point.x;
        var y = point.y;
        vectorPoseXY.push(x, y);
        translateX = Math.min(translateX, x);
        translateY = Math.min(translateY, y);
        scaler = Math.max(scaler, Math.max(x, y));
        vectorPoseConfidences.push(point.confidence);
    });

    return [
        vectorPoseXY,
        vectorPoseConfidences,
        [translateX / scaler, translateY / scaler, scaler]
    ];
}

// 함수: scaleAndTranslate
// 2차원 포즈 벡터를 스케일링하고 변환하는 작업 -> 정규화하는 데 사용가능 
function scaleAndTranslate(vectorPoseXY, transformValues) {
    var transX = transformValues[0], transY = transformValues[1], scaler = transformValues[2];
    return vectorPoseXY.map(function (position, index) {
        return (index % 2 === 0 ?
            position / scaler - transX :
            position / scaler - transY);
    });
}

// 함수: L2Normalization
// 과적합 방지 ,
function L2Normalization(vectorPoseXY) {
    var absVectorPoseXY = 0;
    vectorPoseXY.forEach(function (position) {
        absVectorPoseXY += Math.pow(position, 2);
    });
    absVectorPoseXY = Math.sqrt(absVectorPoseXY);
    return vectorPoseXY.map(function (position) {
        return position / absVectorPoseXY;
    });
}

// 함수: vectorizeAndNormalize
function vectorizeAndNormalize(pose) {
    var _a = convertPoseToVector(pose);
    var vectorPoseXY = _a[0];
    var vectorPoseTransform = _a[2];
    var vectorPoseConfidences = _a[1];

    vectorPoseXY = scaleAndTranslate(vectorPoseXY, vectorPoseTransform);
    vectorPoseXY = L2Normalization(vectorPoseXY);

    return [vectorPoseXY, vectorPoseConfidences];
}

// 함수: poseSimilarity -> 가중거리 와 신뢰도 이용
function poseSimilarity(pose1, pose2) {
    var _a = vectorizeAndNormalize(pose1);
    var vectorPose1XY = _a[0];
    var vectorPose1Scores = _a[1];

    var vectorPose2XY = vectorizeAndNormalize(pose2)[0];
    return weightedDistanceMatching(vectorPose1XY, vectorPose2XY, vectorPose1Scores);
}


function normalizeAndCalculatePercentage(similarity, maxPossibleDist) {
    var minPossibleDist = 0;
   
    similarity = Math.max(minPossibleDist, Math.min(similarity,maxPossibleDist));
    var similarityNormalized = (similarity - minPossibleDist) / (maxPossibleDist - minPossibleDist); // 유사도 정규화
    
    var similarityPercentage = (1 - similarityNormalized) * 100;
    return similarityPercentage.toFixed(1) + "%";
}

function calculateSimilarity() {
    // console.log("Video 1 Skeleton Coordinates:", video1SkeletonCoordinates);
    // console.log("Video 2 Skeleton Coordinates:", video2SkeletonCoordinates);

    if (video1SkeletonCoordinates.length > 0 && video2SkeletonCoordinates.length > 0) {
        

        const maxUpperBodySimilarity = 3;
        const maxFullBodySimilarity = 2.5;
        const maxLowerBodySimilarity = 2.5;

        const similarity = poseSimilarity(video1SkeletonCoordinates, video2SkeletonCoordinates);
        const uppersimilarity = poseSimilarity(video1upperBodySkeletonCoordinates, video2upperBodySkeletonCoordinates);
        const lowersimilarity = poseSimilarity(video1lowerBodySkeletonCoordinates, video2lowerBodySkeletonCoordinates);

        // console.log( "상체" + uppersimilarity);
        // console.log("하체" + lowersimilarity);
        // console.log("전체" + similarity);

        const fullBodySimilarityPercentage = normalizeAndCalculatePercentage(similarity,maxFullBodySimilarity);
        const upperBodySimilarityPercentage = normalizeAndCalculatePercentage(uppersimilarity,maxUpperBodySimilarity);
        const lowerBodySimilarityPercentage = normalizeAndCalculatePercentage(lowersimilarity,maxLowerBodySimilarity);

        console.log("Pose Similarity Percentage:", fullBodySimilarityPercentage);
        console.log("Upper body Pose Similarity Percentage:", upperBodySimilarityPercentage);
        console.log("Lower body Pose Similarity Percentage:", lowerBodySimilarityPercentage);

    } else {
        console.log("스켈레톤 이미지가 없습니다");
    }
}

const measureSimilarityButton = document.getElementById('measureSimilarity');
measureSimilarityButton.addEventListener('click', calculateSimilarity);