backend의 코드를 훑어보고 만약 재사용 할수있는 로직이 있다면 그걸로 사용하고, 현재 구현되어있는
기능들이 동작하는 걸 수정하지않고, 해당 요구사항을 개발할것.

*backend API 로직*
- 현재 user는 token안에 있어서 get요청만 프론트엔드가 날려서 받을 수 있도록 
JWTAUTH를 이용하여 req에서 userid를 받아오고 db에서 userid에 해당하는 imageurl(s3PATH) 필드를 조회한 후에 해당하는 image의 presignedURL을 주는 로직을 만들어줘.

*frontend*

현재 ProfileSettingsModel.tsx 에서 이미지를 변경할때 
현재 이미지를 볼 수 있도록 backend 에서 user의 imageURL을 사용하여 presignedUrL로 받아오는 로직으로
원본 이미지를 

            {/* 이미지 미리보기 */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  {getCurrentProfileImageUrl() ? (
                    <img
                      src={getCurrentProfileImageUrl()!}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl font-semibold">
                      {getUserInitial()}
                    </span>
                  )}
                </div>

이곳에 이미지 폼 태그로 띄워줘. 

만약 유저의 이미지가 null이라서 presignedURL을 못받는다면, 원래 기존에 띄우던 첫글자 이미지를 띄우도록 예외처리해줘.

